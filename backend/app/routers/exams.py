from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..database import get_db
from ..models.exam import Exam
from ..models.user import User
from ..schemas.exam_schema import ExamCreate, ExamUpdate, ExamResponse, ExamDetailResponse, AssignTeacherRequest
from ..config import OCR_CONFIDENCE_THRESHOLD
from .auth import get_current_user

router = APIRouter(prefix="/api/exams", tags=["Exams"])

def _check_exam_artifacts(ex: Exam):
    is_option_2 = ex.grading_mode in [
        "rubric_web_validated", "open_web_search", 
        "web_search_lenient", "option_2", "web_search"
    ]
    has_qp = bool(
        ex.question_paper_path or 
        ex.question_paper_text or 
        (ex.questions and len(ex.questions) > 0)
    )
    
    # Check if rubric / notes document exists
    has_rubric = bool(
        ex.marking_scheme_path or 
        ex.marking_scheme_text or 
        ex.notes_document_path or 
        ex.notes_extracted_text
    )

    # For web search: has web answers been approved / finalized?
    has_web_answers = bool(
        is_option_2 and (
            (ex.status != 'draft' and (ex.marking_scheme_text or ex.marking_scheme_path or (ex.questions and any(bool(q.model_answer) for q in ex.questions)))) or
            (ex.marking_scheme_text and len(ex.marking_scheme_text) > 20)
        )
    )

    if not has_qp:
        setup_status = "needs_qp"
    elif is_option_2:
        if not has_web_answers:
            setup_status = "web_answers_ready"
        else:
            setup_status = "complete"
    else:
        # Option 1: Rubric mode
        if not has_rubric:
            setup_status = "rubric_required"
        else:
            setup_status = "complete"

    has_scheme = has_web_answers if is_option_2 else has_rubric

    return has_qp, has_scheme, has_rubric, setup_status

def _check_exam_access(exam: Exam, current_user: User, action: str = "access"):
    if not current_user:
        return
    # College Admin can access, view, edit, and delete all exams
    if current_user.role in ["admin", "college_admin"]:
        return
    # If the exam is assigned to a specific evaluator, ONLY that assigned evaluator can access it
    if exam.assigned_teacher_id is not None:
        if exam.assigned_teacher_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: This examination has been assigned specifically to another evaluator."
            )
        return
    # If unassigned, only the teacher who created it can access it
    if exam.created_by_id and exam.created_by_id == current_user.id:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=f"Access denied: As a course instructor, you can only {action} exams that are assigned to you by the College Admin or created by you."
    )

@router.get("/teachers/list")
def list_eligible_teachers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Returns list of instructors and faculty available for exam assignment."""
    teachers = db.query(User).filter(User.role.in_(["teacher", "evaluator", "admin"])).all()
    return [
        {"id": u.id, "full_name": u.full_name, "email": u.email, "role": u.role}
        for u in teachers
    ]

@router.get("", response_model=List[ExamResponse])
def list_exams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    is_admin = current_user.role in ["admin", "college_admin"]
    if is_admin:
        # College Admin can access and see all exams across the college
        exams = db.query(Exam).order_by(Exam.created_at.desc()).all()
    else:
        # If an exam is assigned to a specific evaluator, only that assigned evaluator sees it.
        # If unassigned, only the teacher who created it sees it.
        exams = db.query(Exam).filter(
            (Exam.assigned_teacher_id == current_user.id) |
            ((Exam.created_by_id == current_user.id) & (Exam.assigned_teacher_id.is_(None)))
        ).order_by(Exam.created_at.desc()).all()
    results = []
    for ex in exams:
        graded = sum(1 for s in ex.submissions if s.status in ['graded', 'in_review', 'finalized'])
        ocr_flagged = 0
        has_qp, has_scheme, has_rubric, setup_status = _check_exam_artifacts(ex)
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
            ocr_flagged_count=ocr_flagged,
            has_question_paper=has_qp,
            has_evaluation_scheme=has_scheme,
            has_rubric=has_rubric,
            setup_status=setup_status,
            created_by_id=ex.created_by_id,
            created_by_name=ex.creator.full_name if ex.creator else "Course Instructor",
            created_by_email=ex.creator.email if ex.creator else None,
            assigned_teacher_id=ex.assigned_teacher_id,
            assigned_teacher_name=ex.assigned_teacher.full_name if ex.assigned_teacher else None,
            assigned_teacher_email=ex.assigned_teacher.email if ex.assigned_teacher else None
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
        created_by_id=current_user.id if current_user else None
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)
    has_qp, has_scheme, has_rubric, setup_status = _check_exam_artifacts(exam)
    return ExamResponse(
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
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        total_questions=0,
        total_submissions=0,
        graded_count=0,
        ocr_flagged_count=0,
        has_question_paper=has_qp,
        has_evaluation_scheme=has_scheme,
        has_rubric=has_rubric,
        setup_status=setup_status
    )

@router.get("/{exam_id}", response_model=ExamDetailResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    _check_exam_access(exam, current_user, "view")
    
    graded = sum(1 for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized'])
    ocr_flagged = 0
    has_qp, has_scheme, has_rubric, setup_status = _check_exam_artifacts(exam)
    
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
        has_question_paper=has_qp,
        has_evaluation_scheme=has_scheme,
        has_rubric=has_rubric,
        setup_status=setup_status,
        created_by_id=exam.created_by_id,
        created_by_name=exam.creator.full_name if exam.creator else "Course Instructor",
        created_by_email=exam.creator.email if exam.creator else None,
        assigned_teacher_id=exam.assigned_teacher_id,
        assigned_teacher_name=exam.assigned_teacher.full_name if exam.assigned_teacher else None,
        assigned_teacher_email=exam.assigned_teacher.email if exam.assigned_teacher else None,
        questions=exam.questions,
        submissions=exam.submissions
    )

@router.put("/{exam_id}", response_model=ExamResponse)
def update_exam(exam_id: int, exam_in: ExamUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    _check_exam_access(exam, current_user, "edit")
    
    update_data = exam_in.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(exam, field, val)
        
    db.commit()
    db.refresh(exam)
    has_qp, has_scheme, has_rubric, setup_status = _check_exam_artifacts(exam)
    graded = sum(1 for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized'])
    return ExamResponse(
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
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        total_questions=len(exam.questions),
        total_submissions=len(exam.submissions),
        graded_count=graded,
        ocr_flagged_count=0,
        has_question_paper=has_qp,
        has_evaluation_scheme=has_scheme,
        has_rubric=has_rubric,
        setup_status=setup_status
    )

@router.delete("/{exam_id}")
def delete_exam(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    _check_exam_access(exam, current_user, "delete")
    
    # Clean up uploaded submission files and exam documents from disk
    import os
    for sub in exam.submissions:
        if sub.file_path and os.path.exists(sub.file_path):
            try:
                os.remove(sub.file_path)
            except Exception:
                pass
    if exam.question_paper_path and os.path.exists(exam.question_paper_path):
        try:
            os.remove(exam.question_paper_path)
        except Exception:
            pass
    if exam.marking_scheme_path and os.path.exists(exam.marking_scheme_path):
        try:
            os.remove(exam.marking_scheme_path)
        except Exception:
            pass

    db.delete(exam)
    db.commit()
    return {"success": True, "message": f"Exam '{exam.title}' deleted successfully"}

@router.put("/{exam_id}/assign-teacher", response_model=ExamResponse)
def assign_teacher_to_exam(
    exam_id: int, 
    payload: AssignTeacherRequest, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Enables College Admin to assign or delegate exam evaluation to a specific instructor."""
    if current_user.role not in ["admin", "college_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only College Administrators have authority to assign examination evaluations to faculty."
        )

    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if payload.teacher_id:
        target_teacher = db.query(User).filter(User.id == payload.teacher_id).first()
        if not target_teacher:
            raise HTTPException(status_code=404, detail="Selected faculty instructor was not found")
        exam.assigned_teacher_id = target_teacher.id
    else:
        exam.assigned_teacher_id = None

    db.commit()
    db.refresh(exam)

    has_qp, has_scheme, has_rubric, setup_status = _check_exam_artifacts(exam)
    graded = sum(1 for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized'])
    return ExamResponse(
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
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        total_questions=len(exam.questions),
        total_submissions=len(exam.submissions),
        graded_count=graded,
        ocr_flagged_count=0,
        has_question_paper=has_qp,
        has_evaluation_scheme=has_scheme,
        has_rubric=has_rubric,
        setup_status=setup_status,
        created_by_id=exam.created_by_id,
        created_by_name=exam.creator.full_name if exam.creator else "Course Instructor",
        created_by_email=exam.creator.email if exam.creator else None,
        assigned_teacher_id=exam.assigned_teacher_id,
        assigned_teacher_name=exam.assigned_teacher.full_name if exam.assigned_teacher else None,
        assigned_teacher_email=exam.assigned_teacher.email if exam.assigned_teacher else None
    )
