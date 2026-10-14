import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..models.question import Question
from ..models.evaluation import AnswerEvaluation
from ..models.audit import AuditLog
from ..schemas.evaluation_schema import MarkOverrideRequest, FinalizeExamRequest
from ..schemas.report_schema import ReviewMatrixResponse, MatrixStudentRow, AuditLogResponse
from ..config import OCR_CONFIDENCE_THRESHOLD
from ..services.module_evaluator import evaluate_submission_modules, infer_module_and_choice

router = APIRouter(prefix="/api", tags=["Teacher Review & Overrides"])

@router.get("/exams/{exam_id}/review-matrix", response_model=ReviewMatrixResponse)
def get_review_matrix(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions = sorted(exam.questions, key=lambda q: q.order_idx)
    q_meta = []
    for q in questions:
        mod_name, main_q, choice_group = infer_module_and_choice(q.question_number)
        q_meta.append({
            "id": q.id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "max_marks": q.max_marks,
            "grading_type": q.grading_type,
            "model_answer": q.model_answer,
            "module_name": mod_name,
            "main_question": main_q,
            "choice_group": choice_group,
            "rubrics": [
                {
                    "id": r.id,
                    "concept_title": r.concept_title,
                    "weight_marks": r.weight_marks,
                    "keywords": r.keywords
                }
                for r in q.rubric_items
            ]
        })

    student_rows = []
    submissions = sorted(exam.submissions, key=lambda s: s.student_roll)

    total_ai_scores = []
    total_teacher_scores = []

    for sub in submissions:
        q_scores = {}
        total_eval_marks = 0.0

        for q in questions:
            ev = next((e for e in sub.evaluations if e.question_id == q.id), None)
            if ev:
                total_eval_marks += ev.final_marks
                total_ai_scores.append(ev.ai_awarded_marks)
                total_teacher_scores.append(ev.final_marks)
                
                # Parse JSON fields
                strengths = json.loads(ev.strengths) if ev.strengths else []
                missed = json.loads(ev.missed_concepts) if ev.missed_concepts else []
                contradictions = json.loads(ev.contradictions_detected) if ev.contradictions_detected else []
                web_ev = json.loads(ev.web_evidence) if ev.web_evidence else []

                q_scores[q.id] = {
                    "evaluation_id": ev.id,
                    "ai_marks": ev.ai_awarded_marks,
                    "final_marks": ev.final_marks,
                    "confidence_score": ev.confidence_score,
                    "is_overridden": ev.is_overridden,
                    "override_reason": ev.override_reason,
                    "override_by": ev.override_by,
                    "student_answer": ev.student_answer_text,
                    "strengths": strengths,
                    "missed_concepts": missed,
                    "lost_marks_reason": ev.lost_marks_reason,
                    "improvement_suggestions": ev.improvement_suggestions,
                    "contradictions": contradictions,
                    "web_evidence": web_ev,
                    "has_contradiction": len(contradictions) > 0,
                    "has_web_evidence": len(web_ev) > 0,
                    "low_confidence": ev.confidence_score < 0.70
                }
            else:
                q_scores[q.id] = {
                    "evaluation_id": None,
                    "ai_marks": 0.0,
                    "final_marks": 0.0,
                    "confidence_score": 1.0,
                    "is_overridden": False,
                    "override_reason": None,
                    "student_answer": "",
                    "strengths": [],
                    "missed_concepts": [],
                    "has_contradiction": False,
                    "low_confidence": False
                }

        # Compute module-wise totals enforcing 20 marks cap and internal choice
        marks_by_qid = {q.id: q_scores[q.id]["final_marks"] for q in questions}
        mod_res = evaluate_submission_modules(
            questions=questions,
            marks_by_qid=marks_by_qid,
            exam_total_marks=exam.total_marks,
            grace_marks=exam.grace_marks
        )
        total_with_grace = mod_res["total_awarded_marks"]
        pct = mod_res["percentage"]
        passed = (total_with_grace >= exam.pass_marks)

        student_rows.append(MatrixStudentRow(
            submission_id=sub.id,
            student_roll=sub.student_roll,
            student_name=sub.student_name,
            student_email=sub.student_email,
            status=sub.status,
            ocr_confidence=sub.ocr_confidence,
            is_ocr_verified=sub.is_ocr_verified,
            total_marks=round(total_with_grace, 2),
            percentage=round(pct, 1),
            passed=passed,
            question_scores=q_scores,
            module_breakdown=mod_res["module_breakdown"]
        ))

    summary = {
        "total_enrolled": len(submissions),
        "graded_count": sum(1 for s in submissions if s.status in ['graded', 'in_review', 'finalized']),
        "ocr_flags_count": 0,
        "total_overrides": sum(1 for sub in submissions for ev in sub.evaluations if ev.is_overridden)
    }

    return ReviewMatrixResponse(
        exam_id=exam.id,
        exam_title=exam.title,
        exam_code=exam.exam_code,
        grading_mode=exam.grading_mode,
        status=exam.status,
        total_exam_marks=exam.total_marks,
        pass_marks=exam.pass_marks,
        questions=q_meta,
        students=student_rows,
        summary_stats=summary
    )

@router.post("/evaluations/{evaluation_id}/override")
def override_evaluation_mark(
    evaluation_id: int,
    override_data: MarkOverrideRequest,
    db: Session = Depends(get_db)
):
    ev = db.query(AnswerEvaluation).filter(AnswerEvaluation.id == evaluation_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evaluation record not found")

    if not override_data.reason or len(override_data.reason.strip()) < 3:
        raise HTTPException(status_code=400, detail="A mandatory written reason is required to override marks.")

    q = ev.question
    if override_data.new_marks < 0 or override_data.new_marks > q.max_marks:
        raise HTTPException(
            status_code=400,
            detail=f"Overridden marks must be between 0.0 and maximum marks ({q.max_marks})."
        )

    old_marks = ev.final_marks
    ev.final_marks = override_data.new_marks
    ev.is_overridden = True
    ev.override_reason = override_data.reason.strip()
    ev.override_by = "Instructor / Reviewer"
    ev.updated_at = datetime.utcnow()

    # Recalculate submission totals
    sub = ev.submission
    exam = sub.exam
    # Recalculate submission totals taking into account module choice rules
    marks_by_qid = {e.question_id: e.final_marks for e in sub.evaluations}
    module_res = evaluate_submission_modules(
        questions=exam.questions,
        marks_by_qid=marks_by_qid,
        exam_total_marks=exam.total_marks,
        grace_marks=exam.grace_marks
    )
    sub.total_awarded_marks = module_res["total_awarded_marks"]
    sub.percentage = module_res["percentage"]
    sub.passed = (sub.total_awarded_marks >= exam.pass_marks)
    sub.module_scores = json.dumps(module_res["module_breakdown"])
    sub.status = "in_review" if exam.status != "finalized" else "finalized"

    # Save immutable audit log entry
    audit = AuditLog(
        exam_id=exam.id,
        submission_id=sub.id,
        question_id=q.id,
        evaluation_id=ev.id,
        user_email="teacher@evalai.com",
        action="MARK_OVERRIDE",
        old_value=str(old_marks),
        new_value=str(override_data.new_marks),
        reason=override_data.reason.strip()
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "evaluation_id": ev.id,
        "old_marks": old_marks,
        "new_marks": ev.final_marks,
        "override_reason": ev.override_reason,
        "submission_total": sub.total_awarded_marks,
        "message": "Mark override recorded and saved to immutable audit trail."
    }

@router.get("/exams/{exam_id}/audit-logs", response_model=List[AuditLogResponse])
def get_exam_audit_logs(exam_id: int, db: Session = Depends(get_db)):
    return db.query(AuditLog).filter(AuditLog.exam_id == exam_id).order_by(AuditLog.created_at.desc()).all()

@router.post("/exams/{exam_id}/finalize")
def finalize_exam(
    exam_id: int,
    req: FinalizeExamRequest = None,
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    exam.status = "finalized"
    for sub in exam.submissions:
        sub.status = "finalized"

    audit = AuditLog(
        exam_id=exam.id,
        user_email="teacher@evalai.com",
        action="EXAM_FINALIZED",
        old_value="in_review",
        new_value="finalized",
        reason=req.notes if req else "Instructor finalized all grades for publication"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "exam_id": exam.id,
        "status": exam.status,
        "message": f"Exam '{exam.title}' has been successfully approved and finalized for publishing."
    }
