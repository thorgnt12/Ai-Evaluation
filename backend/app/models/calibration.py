from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base

class CalibrationBenchmark(Base):
    __tablename__ = "calibration_benchmarks"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    sample_size = Column(Integer, default=0)
    pearson_r = Column(Float, default=0.0)
    mae = Column(Float, default=0.0)
    contradiction_precision = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    exam = relationship("Exam", back_populates="benchmarks")
