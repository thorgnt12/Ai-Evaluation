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
from ..config import OCR_CONFIDENCE_THRESHOLD
from ..services.ai_grader import ai_grader
from ..services.module_evaluator import evaluate_submission_modules
from ..utils.text_utils import clean_text
from ..models.user import User
from .auth import get_current_user

router = APIRouter(prefix="/api/exams", tags=["AI Grading Engine"])

def split_student_text_by_questions(
    extracted_text: str,
    questions: List[Question],
    student_filename: str = ""
) -> Dict[int, str]:
    """
    Intelligently segments the student's submission text into individual question answers,
    using the Question Paper blueprint and question-guided parsing.
    """
    from ..services.student_answer_parser import parse_student_answer_script
    res = parse_student_answer_script(extracted_text, questions, student_filename)
    return res["by_qid"]

@router.post("/{exam_id}/run-grading")
def run_exam_grading(
    exam_id: int,
    request: BatchGradingRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if current_user.role in ["admin", "college_admin"]:
        is_authorized = True
    elif exam.assigned_teacher_id is not None:
        is_authorized = (exam.assigned_teacher_id == current_user.id)
    else:
        is_authorized = (exam.created_by_id == current_user.id)

    if not is_authorized:
        raise HTTPException(
            status_code=403, 
            detail="Access denied: As a course instructor, you can only trigger grading for exams assigned to you."
        )

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
        # Segment student answers matching question paper structure
        answers_by_qid = split_student_text_by_questions(
            sub.extracted_text or "",
            questions,
            sub.original_filename
        )
        total_sub_marks = 0.0
        marks_by_qid = {}

        for q in questions:
            student_ans = (answers_by_qid.get(q.id) or "").strip()
            
            if student_ans:
                # Run AI Evaluation Engine (Scenario A or Scenario B)
                eval_res = ai_grader.grade_answer(
                    question=q,
                    student_answer=student_ans,
                    grading_mode=exam.grading_mode,
                    teacher_notes=exam.notes_extracted_text or exam.marking_scheme_text
                )
                awarded = eval_res["awarded_marks"]
                conf = eval_res["confidence_score"]
                strengths_val = eval_res["strengths"]
                missed_val = eval_res["missed_concepts"]
                lost_reason = eval_res["lost_marks_reason"]
                impr_sugg = eval_res["improvement_suggestions"]
                contra_val = eval_res["contradictions"]
                web_val = eval_res["web_evidence"]
            else:
                # Question not attempted by student (e.g. chosen alternate option in module)
                awarded = 0.0
                conf = 1.0
                strengths_val = []
                missed_val = ["Question not attempted (alternate module choice selected)"]
                lost_reason = "Not attempted by student."
                impr_sugg = "Attempt all required questions within chosen module options."
                contra_val = []
                web_val = []

            # Check if evaluation record already exists
            eval_record = db.query(AnswerEvaluation).filter(
                AnswerEvaluation.submission_id == sub.id,
                AnswerEvaluation.question_id == q.id
            ).first()

            total_sub_marks += awarded

            if not eval_record:
                eval_record = AnswerEvaluation(
                    submission_id=sub.id,
                    question_id=q.id,
                    student_answer_text=student_ans,
                    ai_awarded_marks=awarded,
                    final_marks=awarded,
                    confidence_score=conf,
                    strengths=json.dumps(strengths_val),
                    missed_concepts=json.dumps(missed_val),
                    lost_marks_reason=lost_reason,
                    improvement_suggestions=impr_sugg,
                    contradictions_detected=json.dumps(contra_val),
                    web_evidence=json.dumps(web_val),
                    is_overridden=False
                )
                db.add(eval_record)
            else:
                # Update existing evaluation (preserve override if user explicitly overrode before)
                eval_record.student_answer_text = student_ans
                eval_record.ai_awarded_marks = awarded
                if not eval_record.is_overridden:
                    eval_record.final_marks = awarded
                eval_record.confidence_score = conf
                eval_record.strengths = json.dumps(strengths_val)
                eval_record.missed_concepts = json.dumps(missed_val)
                eval_record.lost_marks_reason = lost_reason
                eval_record.improvement_suggestions = impr_sugg
                eval_record.contradictions_detected = json.dumps(contra_val)
                eval_record.web_evidence = json.dumps(web_val)

            marks_by_qid[q.id] = eval_record.final_marks

        db.flush()

        # Enforce module-wise OR choices and 20-marks per module cap
        module_eval_res = evaluate_submission_modules(
            questions=questions,
            marks_by_qid=marks_by_qid,
            exam_total_marks=exam.total_marks,
            grace_marks=exam.grace_marks
        )

        sub.total_awarded_marks = module_eval_res["total_awarded_marks"]
        sub.percentage = module_eval_res["percentage"]
        sub.passed = (sub.total_awarded_marks >= exam.pass_marks)
        sub.module_scores = json.dumps(module_eval_res["module_breakdown"])
        sub.status = "graded"
        graded_count += 1

        results_summary.append({
            "submission_id": sub.id,
            "student_roll": sub.student_roll,
            "student_name": sub.student_name,
            "status": "GRADED",
            "score": sub.total_awarded_marks,
            "percentage": sub.percentage,
            "passed": sub.passed,
            "module_breakdown": module_eval_res["module_breakdown"]
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
