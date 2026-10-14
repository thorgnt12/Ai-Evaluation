from pydantic import BaseModel
from typing import Optional, List

class RubricItemBase(BaseModel):
    concept_title: str
    description: Optional[str] = None
    weight_marks: float = 1.0
    keywords: Optional[str] = None  # comma-separated list or JSON
    expected_points: Optional[str] = None  # JSON array
    order_idx: Optional[int] = 0

class RubricItemCreate(RubricItemBase):
    pass

class RubricItemResponse(RubricItemBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    question_number: str
    question_text: str
    max_marks: float = 5.0
    grading_type: Optional[str] = "concept_coverage"  # model_similarity | concept_coverage
    model_answer: Optional[str] = None
    sample_points: Optional[str] = None
    order_idx: Optional[int] = 0

class QuestionCreate(QuestionBase):
    rubric_items: Optional[List[RubricItemCreate]] = []

class QuestionUpdate(BaseModel):
    question_number: Optional[str] = None
    question_text: Optional[str] = None
    max_marks: Optional[float] = None
    grading_type: Optional[str] = None
    model_answer: Optional[str] = None
    sample_points: Optional[str] = None
    order_idx: Optional[int] = None
    rubric_items: Optional[List[RubricItemCreate]] = None

class QuestionResponse(QuestionBase):
    id: int
    exam_id: int
    rubric_items: List[RubricItemResponse] = []

    class Config:
        from_attributes = True

class ParsedQuestionItem(BaseModel):
    question_number: str
    question_text: str
    max_marks: float
    detected_concepts: Optional[List[str]] = []
    extracted_model_answer: Optional[str] = None
    has_table: Optional[bool] = False
    has_diagram: Optional[bool] = False
    options_group: Optional[str] = None

class QuestionPaperParseResponse(BaseModel):
    raw_text: str
    detected_questions: List[ParsedQuestionItem]
    engine_used: Optional[str] = "local"
    total_questions: Optional[int] = 0
