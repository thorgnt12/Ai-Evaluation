from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    exam_code = Column(String(50), unique=True, index=True, nullable=False)
    total_marks = Column(Float, default=100.0)
    pass_marks = Column(Float, default=40.0)
    term = Column(String(50), default="Mid-Term")
    grace_marks = Column(Float, default=0.0)
    
    # Grading Scenario: "notes_grounded" (Scenario A) or "rubric_web_validated" (Scenario B)
    grading_mode = Column(String(50), default="notes_grounded")
    
    # Status: "draft", "ingestion", "ocr_pending", "graded", "in_review", "finalized"
    status = Column(String(50), default="draft")
    
    allow_student_upload = Column(Boolean, default=True)
    allow_replacement = Column(Boolean, default=False)
    
    # Optional raw documents path / text for notes or marking scheme
    notes_document_path = Column(String(500), nullable=True)
    notes_extracted_text = Column(Text, nullable=True)
    marking_scheme_path = Column(String(500), nullable=True)
    marking_scheme_text = Column(Text, nullable=True)
    question_paper_path = Column(String(500), nullable=True)
    question_paper_text = Column(Text, nullable=True)
    
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    questions = relationship("Question", back_populates="exam", cascade="all, delete-orphan", order_by="Question.order_idx")
    submissions = relationship("Submission", back_populates="exam", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="exam", cascade="all, delete-orphan")
    benchmarks = relationship("CalibrationBenchmark", back_populates="exam", cascade="all, delete-orphan")
