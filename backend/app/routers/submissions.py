from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import re
from datetime import datetime

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..models.audit import AuditLog
from ..schemas.submission_schema import (
    SubmissionResponse, SubmissionDetailResponse, TextCorrectionRequest
)
from ..services.document_parser import parse_uploaded_document
from ..services.gemini_vision_parser import extract_student_answers_with_vision
from ..config import SUBMISSIONS_DIR, OCR_CONFIDENCE_THRESHOLD

router = APIRouter(prefix="/api/exams", tags=["Submissions & OCR Gate"])

def extract_student_meta_from_filename(filename: str) -> tuple:
    """
    Attempts to guess roll number and student name from filename (e.g. 'CS101_John_Doe.pdf' or '21BCE045_Jane.docx').
    """
    clean_name = os.path.splitext(filename)[0]
    parts = re.split(r'[-_]+', clean_name)
    if len(parts) >= 2:
        roll = parts[0].strip().upper()
        name = " ".join(parts[1:]).strip().title()
        email = f"{roll.lower()}@university.edu"
        return roll, name, email
    else:
        roll = clean_name[:8].upper()
        name = clean_name.replace("_", " ").title()
        email = f"{roll.lower()}@university.edu"
        return roll, name, email

@router.post("/{exam_id}/submissions/bulk-upload", response_model=List[SubmissionResponse])
async def bulk_upload_submissions(
    exam_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    created_submissions = []

    for file in files:
        content = await file.read()
        saved_filename = f"{exam_id}_{file.filename}"
        dest_path = SUBMISSIONS_DIR / saved_filename
        with open(dest_path, "wb") as f:
            f.write(content)

        parse_res = parse_uploaded_document(content, file.filename)

        # If OCR confidence is low (<70%), attempt high-precision Google Lens Vision AI
        if parse_res["confidence"] < OCR_CONFIDENCE_THRESHOLD:
            vision_res = extract_student_answers_with_vision(content, file.filename)
            if vision_res["text"] and len(vision_res["text"]) > 100:
                parse_res["text"] = vision_res["text"]
                parse_res["confidence"] = vision_res["confidence"]
                parse_res["is_flagged"] = False

        roll, name, email = extract_student_meta_from_filename(file.filename)

        # Check existing submission
        existing = db.query(Submission).filter(
            Submission.exam_id == exam_id,
            Submission.student_roll == roll
        ).first()

        if existing:
            if exam.allow_replacement:
                # Update existing submission
                existing.file_path = str(dest_path)
                existing.original_filename = file.filename
                existing.extracted_text = parse_res["text"]
                existing.ocr_confidence = parse_res["confidence"]
                existing.status = "ready_for_grading"
                existing.is_ocr_verified = True
                db.commit()
                created_submissions.append(existing)
                continue
            else:
                # Append unique roll index to avoid collision
                roll = f"{roll}-{len(created_submissions)+1}"

        status = "ready_for_grading"
        is_verified = True

        sub = Submission(
            exam_id=exam_id,
            student_roll=roll,
            student_name=name,
            student_email=email,
            original_filename=file.filename,
            file_path=str(dest_path),
            file_type=parse_res["file_type"],
            extracted_text=parse_res["text"],
            ocr_confidence=parse_res["confidence"],
            is_ocr_verified=is_verified,
            submission_type="teacher_bulk",
            status=status
        )
        db.add(sub)
        db.flush()
        created_submissions.append(sub)

    # Update exam status if in ingestion
    if exam.status in ["draft", "ingestion"]:
        exam.status = "ocr_pending"

    db.commit()
    return created_submissions

@router.post("/{exam_id}/submissions/student-upload", response_model=SubmissionResponse)
async def student_self_upload(
    exam_id: int,
    student_roll: str = Form(...),
    student_name: str = Form(...),
    student_email: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if not exam.allow_student_upload:
        raise HTTPException(status_code=403, detail="Student self-uploads are closed for this exam")

    # Check for duplicate
    existing = db.query(Submission).filter(
        Submission.exam_id == exam_id,
        Submission.student_roll == student_roll.strip().upper()
    ).first()

    if existing and not exam.allow_replacement:
        raise HTTPException(
            status_code=400,
            detail=f"Submission already exists for roll number '{student_roll}'. Replacements not allowed."
        )

    content = await file.read()
    dest_path = SUBMISSIONS_DIR / f"{exam_id}_{student_roll}_{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(content)

    parse_res = parse_uploaded_document(content, file.filename)
    if parse_res["confidence"] < OCR_CONFIDENCE_THRESHOLD:
        vision_res = extract_student_answers_with_vision(content, file.filename)
        if vision_res["text"] and len(vision_res["text"]) > 100:
            parse_res["text"] = vision_res["text"]
            parse_res["confidence"] = vision_res["confidence"]
            parse_res["is_flagged"] = False

    status = "ready_for_grading"

    if existing:
        existing.file_path = str(dest_path)
        existing.original_filename = file.filename
        existing.student_name = student_name
        existing.student_email = student_email
        existing.extracted_text = parse_res["text"]
        existing.ocr_confidence = parse_res["confidence"]
        existing.status = "ready_for_grading"
        existing.is_ocr_verified = True
        db.commit()
        return existing

    sub = Submission(
        exam_id=exam_id,
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
    return sub

@router.post("/{exam_id}/submissions/{submission_id}/extract-with-lens")
def extract_submission_with_lens(
    exam_id: int,
    submission_id: int,
    db: Session = Depends(get_db)
):
    sub = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.exam_id == exam_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    file_bytes = b""
    if sub.file_path and os.path.exists(sub.file_path):
        with open(sub.file_path, "rb") as f:
            file_bytes = f.read()

    vision_res = extract_student_answers_with_vision(file_bytes, sub.original_filename)
    if not vision_res["text"]:
        raise HTTPException(status_code=400, detail="Could not extract text using Google Lens Vision AI")

    old_text = sub.extracted_text
    from ..services.student_answer_parser import parse_student_answer_script
    parsed = parse_student_answer_script(vision_res["text"], sub.exam.questions, sub.original_filename)
    sub.extracted_text = parsed["structured_full_text"] if parsed.get("structured_full_text") else vision_res["text"]
    sub.ocr_confidence = vision_res["confidence"]
    sub.is_ocr_verified = True
    sub.status = "ready_for_grading"

    audit = AuditLog(
        exam_id=sub.exam_id,
        submission_id=sub.id,
        user_email="teacher@evalai.com",
        action="LENS_VISION_EXTRACTION",
        old_value=f"Old text ({len(old_text or '')} chars)",
        new_value=f"Google Lens Extracted ({len(sub.extracted_text)} chars, {sub.ocr_confidence}%)",
        reason="Google Lens Vision Document AI transcription"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "submission_id": sub.id,
        "extracted_text": sub.extracted_text,
        "ocr_confidence": sub.ocr_confidence,
        "is_ocr_verified": sub.is_ocr_verified,
        "status": sub.status,
        "method": vision_res.get("method", "Google Lens Vision AI")
    }

@router.get("/{exam_id}/submissions/{submission_id}/extracted-answers")
def get_submission_extracted_answers(
    exam_id: int,
    submission_id: int,
    db: Session = Depends(get_db)
):
    sub = db.query(Submission).filter(
        Submission.id == submission_id,
        Submission.exam_id == exam_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    from ..services.student_answer_parser import parse_student_answer_script
    parsed = parse_student_answer_script(sub.extracted_text or "", sub.exam.questions, sub.original_filename)

    detected_answers = []
    for q in sorted(sub.exam.questions, key=lambda x: x.order_idx):
        q_key = q.question_number.lower().lstrip('q')
        ans_text = parsed["by_qnum"].get(q_key, "")
        detected_answers.append({
            "question_id": q.id,
            "question_number": q.question_number,
            "max_marks": q.max_marks,
            "answer_text": ans_text,
            "is_attempted": bool(ans_text and len(ans_text.strip()) > 0)
        })

    return {
        "submission_id": sub.id,
        "student_roll": sub.student_roll,
        "student_name": sub.student_name,
        "raw_text": sub.extracted_text,
        "total_attempted": len(parsed["attempted_questions"]),
        "detected_answers": detected_answers
    }

@router.get("/{exam_id}/submissions", response_model=List[SubmissionResponse])
def list_submissions(exam_id: int, db: Session = Depends(get_db)):
    return db.query(Submission).filter(Submission.exam_id == exam_id).order_by(Submission.student_roll).all()

@router.get("/submissions/{submission_id}", response_model=SubmissionDetailResponse)
def get_submission_detail(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    return sub

@router.post("/submissions/correct-ocr-text")
def correct_ocr_text(
    correction: TextCorrectionRequest,
    db: Session = Depends(get_db)
):
    """
    Allows the teacher to review and verify low-confidence extracted text side-by-side,
    enabling it for AI grading.
    """
    sub = db.query(Submission).filter(Submission.id == correction.submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    old_text = sub.extracted_text
    sub.extracted_text = correction.corrected_text
    sub.is_ocr_verified = True
    sub.verified_at = datetime.utcnow()
    sub.status = "ready_for_grading"

    # Create immutable audit log entry for text correction
    audit = AuditLog(
        exam_id=sub.exam_id,
        submission_id=sub.id,
        user_email="teacher@evalai.com",
        action="TEXT_CORRECTION",
        old_value=f"OCR Conf: {sub.ocr_confidence}%",
        new_value="Verified by Instructor",
        reason=correction.reason or "Manual side-by-side text review"
    )
    db.add(audit)
    db.commit()

    return {
        "success": True,
        "submission_id": sub.id,
        "status": sub.status,
        "is_ocr_verified": sub.is_ocr_verified,
        "message": "Extracted text verified and approved for evaluation."
    }
