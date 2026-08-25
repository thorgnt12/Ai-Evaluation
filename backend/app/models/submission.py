from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    student_roll = Column(String(50), index=True, nullable=False)
    student_name = Column(String(255), nullable=False)
    student_email = Column(String(255), index=True, nullable=False)
    
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), default="pdf")  # pdf, docx, txt, image
    
    extracted_text = Column(Text, nullable=True)
    ocr_confidence = Column(Float, default=100.0)  # 0 to 100
    is_ocr_verified = Column(Boolean, default=False)
    verified_by = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # submission_type: "teacher_bulk", "student_self"
    submission_type = Column(String(50), default="teacher_bulk")
    
    # status: "pending", "ocr_flagged", "ready_for_grading", "graded", "in_review", "finalized"
    status = Column(String(50), default="pending")
    
    total_awarded_marks = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    passed = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    exam = relationship("Exam", back_populates="submissions")
    evaluations = relationship("AnswerEvaluation", back_populates="submission", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="submission", cascade="all, delete-orphan")
