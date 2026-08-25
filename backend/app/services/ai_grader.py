import json
import logging
from typing import Dict, Any, List, Optional
import numpy as np

from ..models.question import Question, RubricItem
from ..models.submission import Submission
from ..utils.text_utils import (
    clean_text,
    tokenize_words,
    detect_contradictions,
    compute_keyword_overlap,
    calculate_tf_idf_similarity
)
from .web_validator import web_validator

logger = logging.getLogger(__name__)

# Global SentenceTransformer holder (lazy loaded)
_EMBEDDING_MODEL = None

def get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        try:
            from sentence_transformers import SentenceTransformer
            # Fast, lightweight model ideal for grading semantic similarity
            _EMBEDDING_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. Using TF-IDF fallback.")
            _EMBEDDING_MODEL = "FALLBACK"
    return _EMBEDDING_MODEL

def compute_semantic_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity between two text snippets."""
    if not text1.strip() or not text2.strip():
        return 0.0
    
    model = get_embedding_model()
    if model != "FALLBACK" and model is not None:
        try:
            emb1 = model.encode([text1], convert_to_numpy=True)[0]
            emb2 = model.encode([text2], convert_to_numpy=True)[0]
            norm1 = np.linalg.norm(emb1)
            norm2 = np.linalg.norm(emb2)
            if norm1 > 0 and norm2 > 0:
                sim = float(np.dot(emb1, emb2) / (norm1 * norm2))
                return max(0.0, min(sim, 1.0))
        except Exception as e:
            logger.warning(f"Error computing embedding similarity: {e}")
            
    # Fallback to TF-IDF cosine similarity
    return calculate_tf_idf_similarity(text1, text2)

class AIGradingEngine:
    def grade_answer(
        self,
        question: Question,
        student_answer: str,
        grading_mode: str = "notes_grounded",  # "notes_grounded" or "rubric_web_validated"
        teacher_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a single question's answer against rubric criteria or model answer.
        """
        student_clean = clean_text(student_answer)
        if not student_clean or len(student_clean.split()) < 2:
            return {
                "awarded_marks": 0.0,
                "confidence_score": 0.95,
                "strengths": [],
                "missed_concepts": ["No substantial answer provided."],
                "lost_marks_reason": "Answer is empty or contains insufficient content.",
                "improvement_suggestions": "Provide a complete explanation addressing the question requirements.",
                "contradictions": [],
                "web_evidence": []
            }

        rubric_items: List[RubricItem] = question.rubric_items or []
        max_marks = float(question.max_marks)
        total_awarded = 0.0
        
        strengths = []
        missed_concepts = []
        contradictions = []
        
        # 1. Model answer similarity score component
        model_ans = question.model_answer or teacher_notes or ""
        overall_semantic_sim = 0.0
        if model_ans:
            overall_semantic_sim = compute_semantic_similarity(student_clean, model_ans)

        # 2. Rubric Concept-by-Concept Weighted Evaluation
        if rubric_items:
            for item in rubric_items:
                concept_weight = float(item.weight_marks)
                # Parse keywords
                raw_kws = item.keywords or ""
                kws = [k.strip() for k in raw_kws.split(",") if k.strip()]
                
                # Check keyword overlap
                kw_ratio, found_kws, missing_kws = compute_keyword_overlap(student_clean, kws)
                
                # Check semantic alignment for this specific concept
                concept_text = f"{item.concept_title}. {item.description or ''}"
                concept_sim = compute_semantic_similarity(student_clean, concept_text)
                
                # Combined concept score (weighted harmonic-mean / blend of semantic + keyword recall)
                if kws:
                    concept_score_ratio = (concept_sim * 0.6) + (kw_ratio * 0.4)
                else:
                    concept_score_ratio = concept_sim
                
                # Contradiction check for this concept
                detected_contras = detect_contradictions(student_clean, concept_text, kws)
                if detected_contras:
                    contradictions.extend(detected_contras)
                    # Penalize contradicted concepts
                    concept_score_ratio = max(0.0, concept_score_ratio - 0.5)

                item_marks = round(concept_weight * min(max(concept_score_ratio, 0.0), 1.0), 2)
                
                # Minimum threshold to award partial marks
                if concept_score_ratio >= 0.45:
                    strengths.append(f"Demonstrated grasp of '{item.concept_title}'")
                    total_awarded += item_marks
                elif concept_score_ratio >= 0.25:
                    strengths.append(f"Partial coverage of '{item.concept_title}'")
                    missed_concepts.append(f"Needs deeper explanation on '{item.concept_title}' (missing keywords: {', '.join(missing_kws[:3])})")
                    total_awarded += item_marks
                else:
                    missed_concepts.append(f"Missed key requirement: '{item.concept_title}'")
        else:
            # Fallback if no specific rubric items: Grade based on model answer semantic similarity
            score_ratio = overall_semantic_sim
            if model_ans:
                kws = tokenize_words(model_ans)[:8]
                detected_contras = detect_contradictions(student_clean, model_ans, kws)
                if detected_contras:
                    contradictions.extend(detected_contras)
                    score_ratio = max(0.0, score_ratio - 0.4)
            
            total_awarded = round(max_marks * min(max(score_ratio, 0.0), 1.0), 2)
            if score_ratio >= 0.6:
                strengths.append("High semantic alignment with the expected model solution.")
            elif score_ratio >= 0.35:
                strengths.append("Addressed core parts of the question with moderate accuracy.")
                missed_concepts.append("Some technical depth or key steps are incomplete.")
            else:
                missed_concepts.append("Answer diverges significantly from the expected solution.")

        # 3. Scenario B: Rubric + Web Validation
        web_evidence_data = []
        if grading_mode == "rubric_web_validated":
            concept_names = [item.concept_title for item in rubric_items]
            validation_res = web_validator.validate_factual_claims(
                student_answer=student_clean,
                rubric_concepts=concept_names,
                question_text=question.question_text
            )
            web_evidence_data = validation_res.get("citations", [])
            for flag in validation_res.get("teacher_flags", []):
                missed_concepts.append(f"[Web Validation Flag]: {flag}")

        # 4. Final bounds checking & feedback formulation
        total_awarded = max(0.0, min(total_awarded, max_marks))
        lost_marks = round(max_marks - total_awarded, 2)
        
        # Deduce lost marks reasoning
        if lost_marks == 0:
            lost_marks_reason = "Full marks awarded. Comprehensive and accurate coverage of all rubric concepts."
            improvement_suggestions = "Excellent response. Maintained technical precision and clarity."
        elif lost_marks <= (max_marks * 0.3):
            lost_marks_reason = f"Deducted {lost_marks} mark(s) due to minor omitted technical details or incomplete terminology."
            improvement_suggestions = "To achieve full marks, include precise technical definitions and supporting examples."
        else:
            lost_marks_reason = f"Deducted {lost_marks} mark(s). Major concepts were missing, insufficient, or contradicted standard definitions."
            improvement_suggestions = "Review the core concepts in the syllabus/marking scheme and focus on thorough step-by-step reasoning."

        # Compute AI confidence score
        ai_conf = 0.92
        if contradictions:
            ai_conf = 0.65  # Flag lower confidence for teacher review when contradictions detected
        elif len(student_clean.split()) < 10:
            ai_conf = 0.75
            
        return {
            "awarded_marks": total_awarded,
            "confidence_score": round(ai_conf, 2),
            "strengths": strengths,
            "missed_concepts": missed_concepts,
            "lost_marks_reason": lost_marks_reason,
            "improvement_suggestions": improvement_suggestions,
            "contradictions": contradictions,
            "web_evidence": web_evidence_data
        }

ai_grader = AIGradingEngine()
