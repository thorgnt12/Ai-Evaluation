from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
import json

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..services.document_parser import parse_uploaded_document
from ..config import SUBMISSIONS_DIR

router = APIRouter(prefix="/api/portal", tags=["Public Student Portal"])

class ResultLookupRequest(BaseModel):
    exam_code: str
    student_roll: str
    student_email: Optional[str] = None

@router.get("/exams")
def list_public_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).all()
    return [
        {
            "id": ex.id,
            "title": ex.title,
            "subject": ex.subject,
            "exam_code": ex.exam_code,
            "term": ex.term,
            "total_marks": ex.total_marks,
            "pass_marks": ex.pass_marks,
            "grading_mode": ex.grading_mode,
            "status": ex.status,
            "allow_student_upload": ex.allow_student_upload
        }
        for ex in exams
    ]

@router.post("/lookup-result")
def lookup_student_result(lookup: ResultLookupRequest, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.exam_code.ilike(lookup.exam_code.strip())).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found with provided exam code.")

    query = db.query(Submission).filter(
        Submission.exam_id == exam.id,
        Submission.student_roll.ilike(lookup.student_roll.strip())
    )
    if lookup.student_email:
        query = query.filter(Submission.student_email.ilike(lookup.student_email.strip()))

    sub = query.first()
    if not sub:
        raise HTTPException(
            status_code=404,
            detail=f"No record found for roll number '{lookup.student_roll}' in exam '{exam.exam_code}'."
        )

    if sub.status not in ["graded", "in_review", "finalized"]:
        return {
            "status": "PROCESSING",
            "message": "Your submission is currently under assessment by the instructor.",
            "student_name": sub.student_name,
            "student_roll": sub.student_roll,
            "exam_title": exam.title
        }

    total_eval = sum(e.final_marks for e in sub.evaluations)
    total_score = min(exam.total_marks, total_eval + exam.grace_marks)
    percentage = (total_score / exam.total_marks * 100) if exam.total_marks > 0 else 0.0
    passed = (total_score >= exam.pass_marks)

    eval_breakdown = []
    for ev in sub.evaluations:
        q = ev.question
        strengths = json.loads(ev.strengths) if ev.strengths else []
        missed = json.loads(ev.missed_concepts) if ev.missed_concepts else []
        eval_breakdown.append({
            "question_number": q.question_number,
            "question_text": q.question_text,
            "max_marks": q.max_marks,
            "awarded_marks": ev.final_marks,
            "strengths": strengths,
            "missed_concepts": missed,
            "feedback": ev.lost_marks_reason,
            "suggestions": ev.improvement_suggestions,
            "is_overridden": ev.is_overridden,
            "override_reason": ev.override_reason if ev.is_overridden else None
        })

    return {
        "status": "PUBLISHED" if exam.status == "finalized" else "EVALUATED",
        "submission_id": sub.id,
        "student_roll": sub.student_roll,
        "student_name": sub.student_name,
        "student_email": sub.student_email,
        "exam_title": exam.title,
        "subject": exam.subject,
        "exam_code": exam.exam_code,
        "grading_mode": exam.grading_mode,
        "term": exam.term,
        "total_exam_marks": exam.total_marks,
        "pass_marks": exam.pass_marks,
        "total_score": round(total_score, 2),
        "percentage": round(percentage, 1),
        "passed": passed,
        "evaluations": eval_breakdown,
        "pdf_download_url": f"/api/submissions/{sub.id}/export/pdf"
    }

@router.post("/submit-answer-sheet")
async def submit_public_answer_sheet(
    exam_code: str = Form(...),
    student_roll: str = Form(...),
    student_name: str = Form(...),
    student_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.exam_code.ilike(exam_code.strip())).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not exam.allow_student_upload:
        raise HTTPException(status_code=403, detail="Student uploads are closed for this exam.")

    content = await file.read()
    dest_path = SUBMISSIONS_DIR / f"{exam.id}_{student_roll.strip()}_{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(content)

    parse_res = parse_uploaded_document(content, file.filename)
    status = "ready_for_grading"

    # Duplicate check
    existing = db.query(Submission).filter(
        Submission.exam_id == exam.id,
        Submission.student_roll == student_roll.strip().upper()
    ).first()

    if existing and not exam.allow_replacement:
        raise HTTPException(
            status_code=400,
            detail=f"An answer sheet is already submitted for roll number '{student_roll}'."
        )

    if existing:
        existing.file_path = str(dest_path)
        existing.original_filename = file.filename
        existing.extracted_text = parse_res["text"]
        existing.ocr_confidence = parse_res["confidence"]
        existing.is_ocr_verified = True
        existing.status = "ready_for_grading"
        db.commit()
        return {
            "success": True,
            "message": "Answer sheet replaced successfully.",
            "submission_id": existing.id,
            "ocr_confidence": existing.ocr_confidence
        }

    sub = Submission(
        exam_id=exam.id,
        student_roll=student_roll.strip().upper(),
        student_name=student_name.strip(),
        student_email=student_email.strip().lower(),
        original_filename=file.filename,
        file_path=str(dest_path),
        file_type=parse_res["file_type"],
        extracted_text=parse_res["text"],
        ocr_confidence=parse_res["confidence"],
        is_ocr_verified=True,
        submission_type="student_self",
        status="ready_for_grading"
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return {
        "success": True,
        "message": "Answer sheet uploaded successfully.",
        "submission_id": sub.id,
        "ocr_confidence": sub.ocr_confidence,
        "ocr_flagged": False
    }
