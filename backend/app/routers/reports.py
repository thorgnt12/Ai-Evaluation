from fastapi import APIRouter, Depends, HTTPException, Response, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import urllib.parse

from ..database import get_db
from ..models.exam import Exam
from ..models.submission import Submission
from ..services.export_service import generate_excel_marksheet, generate_student_pdf_report
from ..services.email_service import email_service
from ..schemas.report_schema import EmailDispatchResponse

router = APIRouter(prefix="/api", tags=["Reports & Dispatch"])

@router.get("/exams/{exam_id}/export/excel")
def download_excel_marksheet(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    excel_bytes = generate_excel_marksheet(exam)
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
