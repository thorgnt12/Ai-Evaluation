from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..database import get_db
from ..models.exam import Exam
from ..models.user import User
from ..schemas.exam_schema import ExamCreate, ExamUpdate, ExamResponse, ExamDetailResponse
from .auth import get_current_user

router = APIRouter(prefix="/api/exams", tags=["Exams"])

@router.get("", response_model=List[ExamResponse])
def list_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.created_at.desc()).all()
    results = []
    for ex in exams:
        graded = sum(1 for s in ex.submissions if s.status in ['graded', 'in_review', 'finalized'])
        ocr_flagged = sum(1 for s in ex.submissions if s.ocr_confidence < 70.0 and not s.is_ocr_verified)
        results.append(ExamResponse(
            id=ex.id,
            title=ex.title,
            subject=ex.subject,
            exam_code=ex.exam_code,
            total_marks=ex.total_marks,
            pass_marks=ex.pass_marks,
            term=ex.term,
            grace_marks=ex.grace_marks,
            grading_mode=ex.grading_mode,
            status=ex.status,
            allow_student_upload=ex.allow_student_upload,
            allow_replacement=ex.allow_replacement,
            question_paper_path=ex.question_paper_path,
            notes_document_path=ex.notes_document_path,
            marking_scheme_path=ex.marking_scheme_path,
            created_at=ex.created_at,
            updated_at=ex.updated_at,
            total_questions=len(ex.questions),
            total_submissions=len(ex.submissions),
            graded_count=graded,
            ocr_flagged_count=ocr_flagged
        ))
    return results

@router.post("", response_model=ExamResponse)
def create_exam(exam_in: ExamCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if exam_code exists
    if db.query(Exam).filter(Exam.exam_code == exam_in.exam_code).first():
        exam_in.exam_code = f"{exam_in.exam_code}-{uuid.uuid4().hex[:4].upper()}"

    exam = Exam(
        title=exam_in.title,
        subject=exam_in.subject,
        exam_code=exam_in.exam_code,
        total_marks=exam_in.total_marks,
        pass_marks=exam_in.pass_marks,
        term=exam_in.term,
        grace_marks=exam_in.grace_marks,
        grading_mode=exam_in.grading_mode,
        status="draft",
        allow_student_upload=exam_in.allow_student_upload,
        allow_replacement=exam_in.allow_replacement,
        created_by_id=current_user.id
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam

@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    graded = sum(1 for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized'])
    ocr_flagged = sum(1 for s in exam.submissions if s.ocr_confidence < 70.0 and not s.is_ocr_verified)
    
    return ExamDetailResponse(
        id=exam.id,
        title=exam.title,
        subject=exam.subject,
        exam_code=exam.exam_code,
        total_marks=exam.total_marks,
        pass_marks=exam.pass_marks,
        term=exam.term,
        grace_marks=exam.grace_marks,
        grading_mode=exam.grading_mode,
        status=exam.status,
        allow_student_upload=exam.allow_student_upload,
        allow_replacement=exam.allow_replacement,
        question_paper_path=exam.question_paper_path,
        notes_document_path=exam.notes_document_path,
        marking_scheme_path=exam.marking_scheme_path,
        question_paper_text=exam.question_paper_text,
        notes_extracted_text=exam.notes_extracted_text,
        marking_scheme_text=exam.marking_scheme_text,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        total_questions=len(exam.questions),
        total_submissions=len(exam.submissions),
        graded_count=graded,
        ocr_flagged_count=ocr_flagged,
        questions=exam.questions,
        submissions=exam.submissions
    )

@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(exam_id: int, exam_in: ExamUpdate, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    update_data = exam_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(exam, field, val)
        
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return {"success": True, "message": "Exam deleted successfully"}
