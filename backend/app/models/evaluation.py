from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class AnswerEvaluation(Base):
    __tablename__ = "answer_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    
    student_answer_text = Column(Text, nullable=True)
    ai_awarded_marks = Column(Float, default=0.0)
    final_marks = Column(Float, default=0.0)
    confidence_score = Column(Float, default=1.0)  # 0.0 to 1.0 (AI confidence)
    
    # Feedback fields
    strengths = Column(Text, nullable=True)  # JSON array of strings
    missed_concepts = Column(Text, nullable=True)  # JSON array of strings
    lost_marks_reason = Column(Text, nullable=True)
    improvement_suggestions = Column(Text, nullable=True)
    
    # Flags & Evidence
    contradictions_detected = Column(Text, nullable=True)  # JSON array of contradiction items
    web_evidence = Column(Text, nullable=True)  # JSON array of web citations & fact check results
    
    # Teacher Override Info
    is_overridden = Column(Boolean, default=False)
    override_reason = Column(Text, nullable=True)
    override_by = Column(String(255), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    submission = relationship("Submission", back_populates="evaluations")
    question = relationship("Question", back_populates="evaluations")
