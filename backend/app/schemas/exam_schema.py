from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .question_schema import QuestionResponse
from .submission_schema import SubmissionResponse

class ExamBase(BaseModel):
    title: str
    subject: str
    exam_code: str
    total_marks: float = 100.0
    pass_marks: float = 40.0
    term: str = "Mid-Term"
    grace_marks: float = 0.0
    grading_mode: str = "notes_grounded"  # "notes_grounded" or "rubric_web_validated"
    allow_student_upload: bool = True
    allow_replacement: bool = False

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    total_marks: Optional[float] = None
    pass_marks: Optional[float] = None
    term: Optional[str] = None
    grace_marks: Optional[float] = None
    grading_mode: Optional[str] = None
    status: Optional[str] = None
    allow_student_upload: Optional[bool] = None
    allow_replacement: Optional[bool] = None

class ExamResponse(ExamBase):
    id: int
    status: str
    question_paper_path: Optional[str] = None
    notes_document_path: Optional[str] = None
    marking_scheme_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_questions: int = 0
    total_submissions: int = 0
    graded_count: int = 0
    ocr_flagged_count: int = 0

    class Config:
        from_attributes = True

class ExamDetailResponse(ExamResponse):
    questions: List[QuestionResponse] = []
    submissions: List[SubmissionResponse] = []
    question_paper_text: Optional[str] = None
    notes_extracted_text: Optional[str] = None
    marking_scheme_text: Optional[str] = None
