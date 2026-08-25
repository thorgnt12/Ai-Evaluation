from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class AnswerEvaluationResponse(BaseModel):
    id: int
    submission_id: int
    question_id: int
    student_answer_text: Optional[str] = None
    ai_awarded_marks: float = 0.0
    final_marks: float = 0.0
    confidence_score: float = 1.0
    strengths: Optional[str] = None  # JSON string
    missed_concepts: Optional[str] = None  # JSON string
    lost_marks_reason: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    contradictions_detected: Optional[str] = None  # JSON string
    web_evidence: Optional[str] = None  # JSON string
    is_overridden: bool = False
    override_reason: Optional[str] = None
    override_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MarkOverrideRequest(BaseModel):
    evaluation_id: int
    new_marks: float
    reason: str  # Mandatory written rationale

class BatchGradingRequest(BaseModel):
    exam_id: int
    submission_ids: Optional[List[int]] = None  # if None, grades all eligible ready submissions

class FinalizeExamRequest(BaseModel):
    notes: Optional[str] = "Finalized and verified by instructor"
