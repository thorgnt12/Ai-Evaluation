import json
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..models.question import Question
from ..models.evaluation import AnswerEvaluation
from ..schemas.evaluation_schema import BatchGradingRequest
from ..services.ai_grader import ai_grader
from ..utils.text_utils import clean_text

router = APIRouter(prefix="/api/exams", tags=["AI Grading Engine"])

def split_student_text_by_questions(extracted_text: str, questions: List[Question]) -> Dict[str, str]:
    """
    Intelligently segments the student's submission text into individual question answers.
    """
    cleaned = clean_text(extracted_text)
    answers = {}
    
    # Common question labels in student answer scripts
    q_map = {q.question_number.lower(): q for q in questions}
    # Pattern to look for "Ans 1:", "Q1:", "1.", "Answer 1", "Question 1"
    pattern = re.compile(
        r'(?:^|\n)(?:(?:Ans|Answer|Q|Question)\s*([0-9]+[a-zA-Z]?|[a-zA-Z])[:\.\)]|(?:[0-9]+)[\.\)])\s*',
        re.IGNORECASE
    )
    
    matches = list(pattern.finditer(cleaned))
    if not matches:
        # If no explicit question markers found, divide paragraphs or provide full text to each question
        paragraphs = [p.strip() for p in cleaned.split('\n\n') if p.strip()]
        for i, q in enumerate(questions):
            if i < len(paragraphs):
                answers[q.id] = paragraphs[i]
            else:
                answers[q.id] = cleaned  # fallback
        return answers

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned)
        chunk = cleaned[start:end].strip()
        matched_tag = match.group(0).strip()
        
        num_part = re.search(r'([0-9]+[a-zA-Z]?|[a-zA-Z])', matched_tag)
        if num_part:
            key_num = f"q{num_part.group(1).lower()}"
            matched_q = next((q for q in questions if q.question_number.lower() in [key_num, num_part.group(1).lower()]), None)
            if matched_q:
                content = chunk[len(matched_tag):].strip()
                answers[matched_q.id] = content

    # For any question not matched, fallback to paragraph index or full context
    for i, q in enumerate(questions):
        if q.id not in answers:
            answers[q.id] = cleaned

    return answers

@router.post("/{exam_id}/run-grading")
def run_exam_grading(
    exam_id: int,
    request: BatchGradingRequest = None,
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = sorted(exam.questions, key=lambda q: q.order_idx)
    if not questions:
        raise HTTPException(status_code=400, detail="No questions configured for this exam")

    # Submissions to grade
    sub_query = db.query(Submission).filter(Submission.exam_id == exam_id)
    if request and request.submission_ids:
        sub_query = sub_query.filter(Submission.id.in_(request.submission_ids))
    
    submissions = sub_query.all()
    if not submissions:
        raise HTTPException(status_code=400, detail="No submissions found to grade")

    graded_count = 0
    blocked_count = 0
    results_summary = []

    for sub in submissions:
        # OCR Quality Gate Check: Block unverified low-confidence scripts (<70%)
        if sub.ocr_confidence < 70.0 and not sub.is_ocr_verified:
            blocked_count += 1
            sub.status = "ocr_flagged"
            results_summary.append({
                "submission_id": sub.id,
                "student_roll": sub.student_roll,
                "status": "BLOCKED_BY_OCR_GATE",
                "ocr_confidence": sub.ocr_confidence,
                "message": "OCR confidence < 70%. Teacher text verification required before grading."
            })
            continue

        # Segment student answers
        answers_by_qid = split_student_text_by_questions(sub.extracted_text or "", questions)
        total_sub_marks = 0.0

        for q in questions:
            student_ans = answers_by_qid.get(q.id, "")
            
            # Run AI Evaluation Engine (Scenario A or Scenario B)
            eval_res = ai_grader.grade_answer(
                question=q,
                student_answer=student_ans,
                grading_mode=exam.grading_mode,
                teacher_notes=exam.notes_extracted_text or exam.marking_scheme_text
            )

            # Check if evaluation record already exists
            eval_record = db.query(AnswerEvaluation).filter(
                AnswerEvaluation.submission_id == sub.id,
                AnswerEvaluation.question_id == q.id
            ).first()

            awarded = eval_res["awarded_marks"]
            total_sub_marks += awarded

            if not eval_record:
                eval_record = AnswerEvaluation(
                    submission_id=sub.id,
                    question_id=q.id,
                    student_answer_text=student_ans,
                    ai_awarded_marks=awarded,
                    final_marks=awarded,
                    confidence_score=eval_res["confidence_score"],
                    strengths=json.dumps(eval_res["strengths"]),
                    missed_concepts=json.dumps(eval_res["missed_concepts"]),
                    lost_marks_reason=eval_res["lost_marks_reason"],
                    improvement_suggestions=eval_res["improvement_suggestions"],
                    contradictions_detected=json.dumps(eval_res["contradictions"]),
                    web_evidence=json.dumps(eval_res["web_evidence"]),
                    is_overridden=False
                )
                db.add(eval_record)
            else:
                # Update existing evaluation (preserve override if user explicitly overrode before)
                eval_record.student_answer_text = student_ans
                eval_record.ai_awarded_marks = awarded
                if not eval_record.is_overridden:
                    eval_record.final_marks = awarded
                eval_record.confidence_score = eval_res["confidence_score"]
                eval_record.strengths = json.dumps(eval_res["strengths"])
                eval_record.missed_concepts = json.dumps(eval_res["missed_concepts"])
                eval_record.lost_marks_reason = eval_res["lost_marks_reason"]
                eval_record.improvement_suggestions = eval_res["improvement_suggestions"]
                eval_record.contradictions_detected = json.dumps(eval_res["contradictions"])
                eval_record.web_evidence = json.dumps(eval_res["web_evidence"])

        # Update submission totals
        total_with_grace = min(exam.total_marks, total_sub_marks + exam.grace_marks)
        sub.total_awarded_marks = round(total_with_grace, 2)
        sub.percentage = round((total_with_grace / exam.total_marks * 100) if exam.total_marks > 0 else 0, 1)
        sub.passed = (total_with_grace >= exam.pass_marks)
        sub.status = "graded"
        graded_count += 1

        results_summary.append({
            "submission_id": sub.id,
            "student_roll": sub.student_roll,
            "student_name": sub.student_name,
            "status": "GRADED",
            "score": round(total_with_grace, 2),
            "percentage": sub.percentage,
            "passed": sub.passed
        })

    if exam.status in ["draft", "ingestion", "ocr_pending"]:
        exam.status = "graded"

    db.commit()
    return {
        "success": True,
        "exam_id": exam_id,
        "grading_mode": exam.grading_mode,
        "graded_submissions": graded_count,
        "blocked_by_ocr_gate": blocked_count,
        "results": results_summary
    }
