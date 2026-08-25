from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_number = Column(String(20), nullable=False)  # "Q1", "Q2a", etc.
    question_text = Column(Text, nullable=False)
    max_marks = Column(Float, nullable=False, default=5.0)
    
    # "model_similarity" or "concept_coverage"
    grading_type = Column(String(50), default="concept_coverage")
    model_answer = Column(Text, nullable=True)
    sample_points = Column(Text, nullable=True)  # JSON or newline-separated points
    order_idx = Column(Integer, default=0)

    # Relationships
    exam = relationship("Exam", back_populates="questions")
    rubric_items = relationship("RubricItem", back_populates="question", cascade="all, delete-orphan", order_by="RubricItem.order_idx")
    evaluations = relationship("AnswerEvaluation", back_populates="question", cascade="all, delete-orphan")


class RubricItem(Base):
    __tablename__ = "rubric_items"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    concept_title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    weight_marks = Column(Float, nullable=False, default=1.0)
    keywords = Column(Text, nullable=True)  # Comma-separated or JSON list of synonyms/terms
    expected_points = Column(Text, nullable=True)  # JSON array of expected facts/phrases
    order_idx = Column(Integer, default=0)

    # Relationships
    question = relationship("Question", back_populates="rubric_items")
