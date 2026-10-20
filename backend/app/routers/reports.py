from fastapi import APIRouter, Depends, HTTPException, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import io
import urllib.parse

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..services.export_service import generate_excel_marksheet, generate_student_pdf_report, generate_web_search_answers_pdf
from ..services.email_service import email_service
from ..schemas.report_schema import EmailDispatchResponse

class WebAnswersExportRequest(BaseModel):
    answers: Optional[List[Dict[str, Any]]] = None

router = APIRouter(prefix="/api", tags=["Reports & Dispatch"])

@router.get("/exams/{exam_id}/export/excel")
def download_excel_marksheet(exam_id: int, teacher_name: Optional[str] = None, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    if not teacher_name:
        if exam.created_by_id:
            from ..models.user import User
            user = db.query(User).filter(User.id == exam.created_by_id).first()
            if user:
                teacher_name = user.full_name
        if not teacher_name:
            from ..models.audit import AuditLog
            audit = db.query(AuditLog).filter(AuditLog.exam_id == exam.id, AuditLog.action == "EXAM_FINALIZED").first()
            if audit and audit.user_email and "teacher" in audit.user_email:
                teacher_name = "Prof. Eleanor Vance"
            else:
                teacher_name = "Prof. Eleanor Vance"

    excel_bytes = generate_excel_marksheet(exam, teacher_name=teacher_name)
    filename = f"Marksheet_{exam.exam_code}_{exam.subject.replace(' ', '_')}.xlsx"
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )

@router.get("/submissions/{submission_id}/export/pdf")
def download_student_pdf(submission_id: int, db: Session = Depends(get_db)):
    sub = db.query(Submission).filter(Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    exam = sub.exam
    pdf_bytes = generate_student_pdf_report(sub, exam)
    filename = f"Report_{sub.student_roll}_{exam.exam_code}.pdf"
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )

@router.post("/exams/{exam_id}/dispatch/test-email")
def dispatch_test_email(exam_id: int, teacher_email: str = "instructor@university.edu", db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    result = email_service.send_test_email(teacher_email, exam)
    return result

@router.post("/exams/{exam_id}/dispatch/bulk-email", response_model=EmailDispatchResponse)
def dispatch_bulk_emails(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    result = email_service.bulk_dispatch_results(exam)
    return EmailDispatchResponse(
        success=result["success"],
        recipient_count=result["recipient_count"],
        message=result["message"],
        logs=result["logs"]
    )


@router.post("/exams/{exam_id}/export/web-answers-pdf")
def export_web_answers_pdf(
    exam_id: int,
    payload: Optional[WebAnswersExportRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Downloads an official PDF document of all web-searched reference model answers,
    mark calibration criteria, and academic citations for the specified exam.
    Accepts customized in-memory answers from the UI if passed.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    answers_data = payload.answers if payload and payload.answers else None
    pdf_bytes = generate_web_search_answers_pdf(exam, answers_data=answers_data)

    safe_subject = (exam.subject or "Exam").replace(" ", "_").replace("/", "_")
    safe_code = (exam.exam_code or "SCHEME").replace(" ", "_")
    filename = f"Web_Search_Answers_{safe_code}_{safe_subject}.pdf"
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )


@router.get("/exams/{exam_id}/export/web-answers-pdf")
def get_web_answers_pdf(exam_id: int, db: Session = Depends(get_db)):
    """
    Direct GET download for web search reference answers PDF using saved questions.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    pdf_bytes = generate_web_search_answers_pdf(exam)

    safe_subject = (exam.subject or "Exam").replace(" ", "_").replace("/", "_")
    safe_code = (exam.exam_code or "SCHEME").replace(" ", "_")
    filename = f"Web_Search_Answers_{safe_code}_{safe_subject}.pdf"
    encoded_filename = urllib.parse.quote(filename)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"}
    )

