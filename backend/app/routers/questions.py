from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import re
import json
import shutil
from pathlib import Path
from pydantic import BaseModel

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
from ..services.gemini_vision_parser import (
    extract_with_gemini_vision,
    get_configured_gemini_key,
    save_gemini_key
)
from ..config import EXAM_DOCS_DIR
from ..services.web_validator import web_validator

router = APIRouter(prefix="/api/exams", tags=["Questions & Rubrics"])

class GeminiKeyPayload(BaseModel):
    api_key: str

class ReextractPayload(BaseModel):
    group_by_main: bool = False
    use_google_lens: bool = True
    gemini_api_key: Optional[str] = None

class WebAnswerGeneratePayload(BaseModel):
    questions: Optional[List[dict]] = None

class SingleWebAnswerPayload(BaseModel):
    question_number: str
    question_text: str
    max_marks: float = 5.0

lens_router = APIRouter(prefix="/api/lens", tags=["Google Lens / Gemini Vision"])

@lens_router.get("/status")
def get_lens_status():
    """Returns whether Google Lens / Gemini Vision is configured."""
    key = get_configured_gemini_key()
    return {
        "active": bool(key),
        "has_key": bool(key),
        "masked_key": f"{key[:4]}...{key[-4:]}" if len(key) >= 8 else ("configured" if key else "")
    }

@lens_router.post("/set-key")
def set_gemini_key(payload: GeminiKeyPayload):
    """Save Gemini API key to activate Google Lens vision technology."""
    if not payload.api_key.strip():
        raise HTTPException(status_code=400, detail="API key cannot be empty")
    saved = save_gemini_key(payload.api_key)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save API key to configuration")
    return {"success": True, "message": "Google Lens / Gemini Vision AI key successfully configured"}


@router.post("/{exam_id}/upload-question-paper", response_model=QuestionPaperParseResponse)
async def upload_question_paper(
    exam_id: int,
    file: UploadFile = File(...),
    group_by_main: bool = Form(False),
    use_google_lens: bool = Form(True),
    gemini_api_key: Optional[str] = Form(None),
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

    engine_used = "Enhanced Local Vision OCR"
    parsed_questions: List[ParsedQuestionItem] = []

    # 1. Attempt Google Lens Vision extraction if enabled
    if use_google_lens:
        active_key = gemini_api_key or get_configured_gemini_key()
        if active_key:
            lens_results = extract_with_gemini_vision(
                file_bytes=content,
                filename=file.filename,
                api_key=active_key,
                group_by_main_questions=group_by_main
            )
            if lens_results and len(lens_results) > 0:
                parsed_questions = lens_results
                engine_used = "Google Lens Vision AI"

    # 2. Seamless intelligent fallback if Lens not active or returned empty
    if not parsed_questions:
        parsed_questions = parse_question_paper_text(raw_text, group_by_main=group_by_main)

    return QuestionPaperParseResponse(
        raw_text=raw_text,
        detected_questions=parsed_questions,
        engine_used=engine_used,
        total_questions=len(parsed_questions)
    )

@router.post("/{exam_id}/reextract-qp", response_model=QuestionPaperParseResponse)
def reextract_uploaded_qp(
    exam_id: int,
    payload: ReextractPayload,
    db: Session = Depends(get_db)
):
    """
    Re-extracts the currently uploaded question paper using either Google Lens
    or enhanced local OCR, with optional grouping (5 Main Questions vs Sub-Questions).
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam or not exam.question_paper_path:
        raise HTTPException(status_code=404, detail="Uploaded question paper not found for this exam")

    file_path = Path(exam.question_paper_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Question paper file missing on disk")

    with open(file_path, "rb") as f:
        content = f.read()

    engine_used = "Enhanced Local Vision OCR"
    parsed_questions: List[ParsedQuestionItem] = []

    if payload.use_google_lens:
        active_key = payload.gemini_api_key or get_configured_gemini_key()
        if active_key:
            lens_results = extract_with_gemini_vision(
                file_bytes=content,
                filename=file_path.name,
                api_key=active_key,
                group_by_main_questions=payload.group_by_main
            )
            if lens_results and len(lens_results) > 0:
                parsed_questions = lens_results
                engine_used = "Google Lens Vision AI"

    if not parsed_questions:
        parse_res = parse_uploaded_document(content, file_path.name)
        raw_text = parse_res["text"]
        exam.question_paper_text = raw_text
        db.commit()
        parsed_questions = parse_question_paper_text(raw_text, group_by_main=payload.group_by_main)

    return QuestionPaperParseResponse(
        raw_text=exam.question_paper_text or "",
        detected_questions=parsed_questions,
        engine_used=engine_used,
        total_questions=len(parsed_questions)
    )

@router.post("/{exam_id}/upload-knowledge-document")
async def upload_knowledge_document(
    exam_id: int,
    doc_type: str = Form(...),  # "notes" or "marking_scheme"
    file: UploadFile = File(...),
    questions_json: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    import json
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

    # Extract rubrics per question so teacher can verify full criteria breakdown
    rubrics_by_question = {}
    target_questions = []

    if questions_json:
        try:
            target_questions = json.loads(questions_json)
        except Exception:
            target_questions = []

    if not target_questions:
        db_qs = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.order_idx).all()
        if db_qs:
            target_questions = [{"question_number": q.question_number, "max_marks": q.max_marks} for q in db_qs]

    if not target_questions:
        # Default subquestions found in university schemes
        default_q_nums = ["1a", "1b", "2a", "2b", "3a", "3b", "3c", "4a", "4b", "4c", "5a", "5b"]
        for qn in default_q_nums:
            if re.search(rf'(?:^|\n)(?:Q\.?\s*)?{qn}\b', raw_text, re.IGNORECASE):
                target_questions.append({"question_number": qn, "max_marks": 8.0})

    for q_item in target_questions:
        q_num = str(q_item.get("question_number", "")).strip()
        q_marks = float(q_item.get("max_marks", 5.0))
        if not q_num:
            continue
        parsed_rubrics = extract_rubric_from_marking_scheme(raw_text, q_num, q_marks)
        rubrics_by_question[q_num] = [
            r.model_dump() if hasattr(r, 'model_dump') else r.dict()
            for r in parsed_rubrics
        ]

    total_criteria = sum(len(items) for items in rubrics_by_question.values())

    return {
        "success": True,
        "doc_type": doc_type,
        "filename": file.filename,
        "extracted_text": raw_text,
        "line_count": len(raw_text.splitlines()),
        "char_count": len(raw_text),
        "rubrics_by_question": rubrics_by_question,
        "total_rubrics": total_criteria
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

        rubric_items = q_data.rubric_items
        if not rubric_items:
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

    if total_calc_marks > 0:
        from ..services.module_evaluator import calculate_exam_max_marks
        effective_max = calculate_exam_max_marks(saved_questions)
        exam.total_marks = effective_max if effective_max > 0 else total_calc_marks
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


@router.post("/{exam_id}/generate-web-answers")
def generate_web_answers_for_exam(
    exam_id: int,
    payload: Optional[WebAnswerGeneratePayload] = None,
    db: Session = Depends(get_db)
):
    """
    Batch generates marks-calibrated reference answers, model explanations, rubric criteria,
    and verified academic citations for all questions of the exam using Open Web Search.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    questions_data = []
    if payload and payload.questions:
        questions_data = payload.questions
    else:
        db_qs = db.query(Question).filter(Question.exam_id == exam_id).order_by(Question.order_idx).all()
        if db_qs:
            for q in db_qs:
                questions_data.append({
                    "question_number": q.question_number,
                    "question_text": q.question_text,
                    "max_marks": q.max_marks,
                    "model_answer": q.model_answer or ""
                })

    if not questions_data:
        raise HTTPException(status_code=400, detail="No questions provided or found for this exam")

    results = web_validator.generate_web_reference_answers_for_exam(
        questions=questions_data,
        exam_subject=exam.subject or ""
    )

    return {
        "success": True,
        "exam_id": exam_id,
        "total_questions": len(results),
        "generated_answers": results
    }


@router.post("/{exam_id}/generate-single-web-answer")
def generate_single_web_answer(
    exam_id: int,
    payload: SingleWebAnswerPayload,
    db: Session = Depends(get_db)
):
    """
    Generates a marks-calibrated web reference answer for a single question.
    """
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    result = web_validator.generate_marks_calibrated_answer(
        question_text=payload.question_text,
        max_marks=payload.max_marks,
        question_number=payload.question_number,
        exam_subject=exam.subject or ""
    )

    return {
        "success": True,
        "generated_answer": result
    }

