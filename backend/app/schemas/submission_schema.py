from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .evaluation_schema import AnswerEvaluationResponse

class SubmissionBase(BaseModel):
    student_roll: str
    student_name: str
    student_email: str

class SubmissionCreate(SubmissionBase):
    exam_id: int

class SubmissionResponse(SubmissionBase):
    id: int
    exam_id: int
    original_filename: str
    file_type: str
    extracted_text: Optional[str] = None
    ocr_confidence: float
    is_ocr_verified: bool
    submission_type: str
    status: str
    total_awarded_marks: float
    percentage: float
    passed: bool
    module_scores: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SubmissionDetailResponse(SubmissionResponse):
    extracted_text: Optional[str] = None
    evaluations: List[AnswerEvaluationResponse] = []

class TextCorrectionRequest(BaseModel):
    submission_id: int
    corrected_text: str
    reason: Optional[str] = "Teacher OCR text verification correction"

class StudentPublicResultResponse(BaseModel):
    student_roll: str
    student_name: str
    exam_title: str
    subject: str
    exam_code: str
    total_marks: float
    pass_marks: float
    awarded_marks: float
    percentage: float
    passed: bool
    status: str
    evaluations: List[AnswerEvaluationResponse] = []
