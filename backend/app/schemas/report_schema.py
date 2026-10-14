from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any

class MatrixStudentRow(BaseModel):
    submission_id: int
    student_roll: str
    student_name: str
    student_email: str
    status: str
    ocr_confidence: float
    is_ocr_verified: bool
    total_marks: float
    percentage: float
    passed: bool
    # map question_id -> evaluation details
    question_scores: Dict[int, Dict[str, Any]]
    module_breakdown: Optional[Dict[str, Any]] = None

class ReviewMatrixResponse(BaseModel):
    exam_id: int
    exam_title: str
    exam_code: str
    grading_mode: str
    status: str
    total_exam_marks: float
    pass_marks: float
    questions: List[Dict[str, Any]]
    students: List[MatrixStudentRow]
    summary_stats: Dict[str, Any]

class AuditLogResponse(BaseModel):
    id: int
    exam_id: int
    submission_id: Optional[int] = None
    question_id: Optional[int] = None
    user_email: Optional[str] = None
    action: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    reason: str
    created_at: Any

    class Config:
        from_attributes = True

class DiscriminationIndexItem(BaseModel):
    question_id: int
    question_number: str
    max_marks: float
    average_score: float
    upper_group_avg: float
    lower_group_avg: float
    discrimination_index: float
    quality_label: str

class ClassAnalyticsResponse(BaseModel):
    exam_id: int
    exam_title: str
    total_students: int
    graded_students: int
    class_average: float
    class_median: float
    std_deviation: float
    highest_score: float
    lowest_score: float
    pass_percentage: float
    score_distribution: List[Dict[str, Any]]
    pass_fail_distribution: List[Dict[str, Any]]
    question_performance: List[Dict[str, Any]]
    discrimination_analysis: List[DiscriminationIndexItem]
    top_performers: List[Dict[str, Any]]

class CalibrationBenchmarkResponse(BaseModel):
    sample_size: int
    pearson_r: float
    mae: float
    contradiction_precision: float
    ai_agreement_rate: float
    interpretation: str
    details: List[Dict[str, Any]]

class EmailDispatchResponse(BaseModel):
    success: bool
    recipient_count: int
    message: str
    logs: List[Dict[str, Any]]
