from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from ..database import get_db
from ..models.exam import Exam
from ..schemas.report_schema import ClassAnalyticsResponse, CalibrationBenchmarkResponse
from ..services.analytics_service import compute_class_analytics, compute_calibration_benchmark

router = APIRouter(prefix="/api/exams", tags=["Analytics & Calibration"])

@router.get("/{exam_id}/analytics", response_model=ClassAnalyticsResponse)
def get_exam_analytics(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return compute_class_analytics(exam)

@router.get("/{exam_id}/calibration", response_model=CalibrationBenchmarkResponse)
def get_calibration_metrics(exam_id: int, db: Session = Depends(get_db)):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    
    return compute_calibration_benchmark(exam)
