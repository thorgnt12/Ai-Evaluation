from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import shutil
from pathlib import Path

from ..database import get_db
from ..models.exam import Exam
from ..models.question import Question, RubricItem
from ..schemas.question_schema import (
    QuestionCreate, QuestionUpdate, QuestionResponse,
    QuestionPaperParseResponse, ParsedQuestionItem, RubricItemCreate
)
from ..services.document_parser import parse_uploaded_document
from ..services.question_parser import parse_question_paper_text
from ..services.rubric_extractor import extract_rubric_from_marking_scheme
from ..config import EXAM_DOCS_DIR

router = APIRouter(prefix="/api/exams", tags=["Questions & Rubrics"])

@router.post("/{exam_id}/upload-question-paper", response_model=QuestionPaperParseResponse)
async def upload_question_paper(
    exam_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    content = await file.read()
    dest_path = EXAM_DOCS_DIR / f"qp_{exam_id}_{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(content)

    parse_result = parse_uploaded_document(content, file.filename)
    raw_text = parse_result["text"]
    
    exam.question_paper_path = str(dest_path)
    exam.question_paper_text = raw_text
    db.commit()

    # Automatically identify questions, numbers, and marks
    parsed_questions = parse_question_paper_text(raw_text)
    return QuestionPaperParseResponse(
        raw_text=raw_text,
        detected_questions=parsed_questions
    )

@router.post("/{exam_id}/upload-knowledge-document")
async def upload_knowledge_document(
    exam_id: int,
    doc_type: str = Form(...),  # "notes" or "marking_scheme"
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    content = await file.read()
    dest_path = EXAM_DOCS_DIR / f"{doc_type}_{exam_id}_{file.filename}"
    with open(dest_path, "wb") as f:
        f.write(content)

    parse_result = parse_uploaded_document(content, file.filename)
    raw_text = parse_result["text"]

    if doc_type == "notes":
        exam.notes_document_path = str(dest_path)
        exam.notes_extracted_text = raw_text
    else:
        exam.marking_scheme_path = str(dest_path)
        exam.marking_scheme_text = raw_text

    db.commit()
    return {
        "success": True,
        "doc_type": doc_type,
        "filename": file.filename,
        "extracted_text": raw_text[:500] + ("..." if len(raw_text) > 500 else "")
    }

@router.post("/{exam_id}/save-questions", response_model=List[QuestionResponse])
def save_exam_questions(
    exam_id: int,
    questions_in: List[QuestionCreate],
    db: Session = Depends(get_db)
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    # Clear previous questions for this exam
    db.query(Question).filter(Question.exam_id == exam_id).delete()
    db.commit()

    saved_questions = []
    total_calc_marks = 0.0

    for idx, q_data in enumerate(questions_in):
        q = Question(
            exam_id=exam_id,
            question_number=q_data.question_number,
            question_text=q_data.question_text,
            max_marks=q_data.max_marks,
            grading_type=q_data.grading_type or "concept_coverage",
            model_answer=q_data.model_answer,
            sample_points=q_data.sample_points,
            order_idx=idx
        )
        db.add(q)
        db.flush()

        total_calc_marks += q_data.max_marks

        # Add rubric items if provided or auto-generate if missing
        rubric_items = q_data.rubric_items
        if not rubric_items:
            # Try extracting from marking scheme/notes if available
            reference_text = exam.marking_scheme_text or exam.notes_extracted_text or q_data.model_answer or ""
            rubric_items = extract_rubric_from_marking_scheme(reference_text, q_data.question_number, q_data.max_marks)

        for r_idx, r_item in enumerate(rubric_items):
            r = RubricItem(
                question_id=q.id,
                concept_title=r_item.concept_title,
                description=r_item.description,
                weight_marks=r_item.weight_marks,
                keywords=r_item.keywords,
                expected_points=r_item.expected_points,
                order_idx=r_idx
            )
            db.add(r)

        saved_questions.append(q)

    # Sync exam total marks
    if total_calc_marks > 0:
        exam.total_marks = total_calc_marks
        if exam.status == "draft":
            exam.status = "ingestion"

    db.commit()
    return db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.order_idx).all()

@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_single_question(
    question_id: int,
    q_in: QuestionUpdate,
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    update_dict = q_in.dict(exclude_unset=True)
    rubric_data = update_dict.pop("rubric_items", None)

    for k, v in update_dict.items():
        setattr(q, k, v)

    if rubric_data is not None:
        db.query(RubricItem).filter(RubricItem.question_id == question_id).delete()
        for idx, r_in in enumerate(rubric_data):
            r = RubricItem(
                question_id=question_id,
                concept_title=r_in["concept_title"],
                description=r_in.get("description"),
                weight_marks=r_in.get("weight_marks", 1.0),
                keywords=r_in.get("keywords"),
                expected_points=r_in.get("expected_points"),
                order_idx=idx
            )
            db.add(r)

    db.commit()
    db.refresh(q)
    return q
