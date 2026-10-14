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
    calculate_tf_idf_similarity,
    extract_keywords
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
        grading_mode: str = "notes_grounded",  # "notes_grounded" (Option 1) or "rubric_web_validated" (Option 2)
        teacher_notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates a single question's answer.
        Supported Modes:
          - Option 1 (Notes & Rubric): Answer sheet + Question paper + Notes or Rubric.
            Correction style: Moderate correction (balanced, fair partial credit, not overly strict).
          - Option 2 (Web Search): Answer sheet + Question paper ONLY.
            Action: Searches answer on the web for reference ground truth.
            Correction style: Lenient correction (generous marks, student-friendly scoring).
        """
        student_clean = clean_text(student_answer)
        max_marks = float(getattr(question, "max_marks", 10.0))
        q_text = getattr(question, "question_text", "") or ""
        model_ans = getattr(question, "model_answer", "") or ""
        rubric_items: List[RubricItem] = getattr(question, "rubric_items", []) or []

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

        total_awarded = 0.0
        strengths = []
        missed_concepts = []
        contradictions = []
        web_evidence_data = []

        is_option_2 = (grading_mode in ["rubric_web_validated", "open_web_search", "web_search_lenient", "option_2", "web_search"])

        # =========================================================================
        # OPTION 2: WEB SEARCH EVALUATION WITH LENIENT CORRECTION
        # Inputs: Answersheet + Question Paper ONLY.
        # Action: Searches answer on the web and evaluates with high leniency.
        # =========================================================================
        if is_option_2:
            concept_names = [item.concept_title for item in rubric_items]
            validation_res = web_validator.validate_factual_claims(
                student_answer=student_clean,
                rubric_concepts=concept_names,
                question_text=q_text
            )
            web_evidence_data = validation_res.get("citations", [])
            web_ref_text = validation_res.get("web_reference_text", "")

            # Semantic similarity against retrieved web knowledge, question prompt & model answer (if any)
            web_sim = compute_semantic_similarity(student_clean, web_ref_text) if web_ref_text else 0.0
            q_sim = compute_semantic_similarity(student_clean, q_text)
            model_sim = compute_semantic_similarity(student_clean, model_ans) if model_ans else 0.0

            # Extract topic keywords from web reference and question
            topic_kws = extract_keywords(q_text + " " + web_ref_text, top_n=12)
            kw_ratio, found_kws, missing_kws = compute_keyword_overlap(student_clean, topic_kws)

            # Check for direct contradictions against standard factual principles
            if web_ref_text:
                detected_contras = detect_contradictions(student_clean, web_ref_text, topic_kws[:6])
                if detected_contras:
                    contradictions.extend(detected_contras)

            # LENIENT CORRECTION SCORING CURVE:
            # High leniency: reward the student generously if they understand the intuition,
            # capture key ideas from web references, or address the prompt meaningfully.
            raw_affinity = max(
                web_sim,
                (web_sim * 0.55) + (kw_ratio * 0.45),
                (q_sim * 0.50) + (kw_ratio * 0.50),
                kw_ratio * 0.75,
                model_sim
            )

            # In lenient mode, minor contradictions only deduct a small fraction
            if contradictions:
                raw_affinity = max(0.0, raw_affinity - 0.12)

            word_count = len(student_clean.split())

            if raw_affinity >= 0.22 or (raw_affinity >= 0.14 and kw_ratio >= 0.20):
                # Full marks (95 - 100%)
                total_awarded = round(max_marks * min(1.0, 0.95 + (raw_affinity * 0.05)), 2)
                strengths.append("Demonstrated clear understanding aligned with online academic references.")
                if found_kws:
                    strengths.append(f"Successfully addressed core subject concepts: {', '.join(found_kws[:4])}")
            elif raw_affinity >= 0.12 or kw_ratio >= 0.15 or (word_count >= 12 and raw_affinity >= 0.08):
                # High lenient marks (80 - 90%)
                total_awarded = round(max_marks * 0.85, 2)
                strengths.append("Captured the core logic and fundamental mechanism effectively.")
                if found_kws:
                    strengths.append(f"Referenced key domain terms: {', '.join(found_kws[:3])}")
                if missing_kws:
                    missed_concepts.append(f"Could be enriched with additional standard details: {', '.join(missing_kws[:2])}")
            elif raw_affinity >= 0.05 or word_count >= 6:
                # Solid lenient passing marks (65 - 75%)
                total_awarded = round(max_marks * 0.70, 2)
                strengths.append("Demonstrated foundational intuition of the subject.")
                missed_concepts.append("Explanation covers primary ideas but lacks deeper formal elaboration.")
            else:
                # Basic attempt (40 - 50%)
                total_awarded = round(max_marks * 0.45, 2)
                missed_concepts.append("Answer touches on the topic but diverges from standard web reference explanations.")

            total_awarded = max(0.0, min(total_awarded, max_marks))
            lost_marks = round(max_marks - total_awarded, 2)

            if lost_marks == 0:
                lost_marks_reason = "Full marks awarded via Option 2 (Web Search with Lenient Correction). Answer accurately captures standard web reference concepts."
                improvement_suggestions = "Outstanding response! Strong alignment with verified online educational sources."
            elif lost_marks <= (max_marks * 0.20):
                lost_marks_reason = f"Deducted {lost_marks} mark(s) under lenient web evaluation. Minor omission of secondary standard details."
                improvement_suggestions = "Great response! Demonstrates solid understanding. Adding one or two illustrative examples would make it complete."
            else:
                lost_marks_reason = f"Deducted {lost_marks} mark(s) under lenient web evaluation."
                improvement_suggestions = "Review the core concepts from the referenced web citations for more comprehensive elaboration."

        # =========================================================================
        # OPTION 1: NOTES / RUBRIC EVALUATION WITH MODERATE CORRECTION
        # Inputs: Answersheet + Question Paper + Notes or Rubric.
        # Action: Evaluates against teacher notes/rubric with balanced, fair correction.
        #         ("midiocar correction - not too strict")
        # =========================================================================
        else:
            # 1. Rubric Concept-by-Concept Weighted Evaluation (if rubric items exist)
            if rubric_items:
                for item in rubric_items:
                    concept_weight = float(item.weight_marks)
                    raw_kws = item.keywords or ""
                    kws = [k.strip() for k in raw_kws.split(",") if k.strip()]
                    
                    kw_ratio, found_kws, missing_kws = compute_keyword_overlap(student_clean, kws)
                    concept_text = f"{item.concept_title}. Expected concepts: {raw_kws}. {item.description or ''}"
                    concept_sim = compute_semantic_similarity(student_clean, concept_text)
                    
                    # Balanced affinity matching student words to teacher criteria
                    if kws:
                        concept_score_ratio = max((concept_sim * 0.55) + (kw_ratio * 0.45), concept_sim * 0.80, kw_ratio * 0.80)
                    else:
                        concept_score_ratio = concept_sim
                    
                    detected_contras = detect_contradictions(student_clean, concept_text, kws)
                    if detected_contras:
                        contradictions.extend(detected_contras)
                        concept_score_ratio = max(0.0, concept_score_ratio - 0.20)  # Moderate deduction

                    # MODERATE CORRECTION CURVE:
                    # Fair, balanced, and forgiving of minor phrasing differences
                    if concept_score_ratio >= 0.42:
                        # Full marks for capturing concept
                        item_marks = concept_weight
                        strengths.append(f"Demonstrated clear understanding of '{item.concept_title}'")
                        total_awarded += item_marks
                    elif concept_score_ratio >= 0.28:
                        # Substantial marks (80 - 90%) for capturing main idea
                        item_marks = round(concept_weight * 0.85, 2)
                        strengths.append(f"Good grasp of '{item.concept_title}'")
                        total_awarded += item_marks
                    elif concept_score_ratio >= 0.14 or len(found_kws) > 0:
                        # Generous partial credit (60 - 70%)
                        item_marks = round(concept_weight * 0.65, 2)
                        strengths.append(f"Partial coverage of '{item.concept_title}'")
                        if missing_kws:
                            missed_concepts.append(f"Could elaborate more on '{item.concept_title}' (missing keywords: {', '.join(missing_kws[:2])})")
                        total_awarded += item_marks
                    elif len(student_clean.split()) >= 6:
                        # Foundational attempt (35 - 45%)
                        item_marks = round(concept_weight * 0.40, 2)
                        total_awarded += item_marks
                        missed_concepts.append(f"Needs further detail on '{item.concept_title}'")
                    else:
                        missed_concepts.append(f"Missed key requirement: '{item.concept_title}'")
            else:
                # Evaluated against teacher notes / syllabus and model answer
                ref_source = (teacher_notes or "") + " " + (model_ans or "")
                ref_clean = ref_source.strip() if ref_source.strip() else q_text
                
                overall_semantic_sim = compute_semantic_similarity(student_clean, ref_clean)
                ref_kws = extract_keywords(ref_clean, top_n=10)
                kw_ratio, found_kws, missing_kws = compute_keyword_overlap(student_clean, ref_kws)

                affinity = max(overall_semantic_sim, (overall_semantic_sim * 0.60) + (kw_ratio * 0.40), kw_ratio * 0.75)

                if ref_clean:
                    detected_contras = detect_contradictions(student_clean, ref_clean, ref_kws[:5])
                    if detected_contras:
                        contradictions.extend(detected_contras)
                        affinity = max(0.0, affinity - 0.20)

                # MODERATE CORRECTION CURVE FOR NOTES:
                if affinity >= 0.38:
                    total_awarded = round(max_marks * min(1.0, 0.90 + (affinity * 0.15)), 2)
                    strengths.append("Solid alignment with teacher notes and expected marking criteria.")
                    if found_kws:
                        strengths.append(f"Highlighted key concepts: {', '.join(found_kws[:3])}")
                elif affinity >= 0.24:
                    total_awarded = round(max_marks * 0.80, 2)
                    strengths.append("Addressed core principles and key mechanisms effectively.")
                    if missing_kws:
                        missed_concepts.append(f"Could expand on: {', '.join(missing_kws[:2])}")
                elif affinity >= 0.12 or len(student_clean.split()) >= 10:
                    total_awarded = round(max_marks * 0.60, 2)
                    strengths.append("Covers fundamental ideas with acceptable explanation.")
                    if missing_kws:
                        missed_concepts.append(f"Could incorporate additional details: {', '.join(missing_kws[:3])}")
                else:
                    total_awarded = round(max_marks * 0.35, 2)
                    missed_concepts.append("Touches on the topic but omits important concepts from teacher notes.")

            total_awarded = max(0.0, min(total_awarded, max_marks))
            lost_marks = round(max_marks - total_awarded, 2)

            if lost_marks == 0:
                lost_marks_reason = "Full marks awarded via Option 1 (Notes & Rubric with Moderate Correction). Comprehensive coverage of teacher criteria."
                improvement_suggestions = "Excellent response! Maintained technical clarity and thorough reasoning."
            elif lost_marks <= (max_marks * 0.25):
                lost_marks_reason = f"Deducted {lost_marks} mark(s) under moderate correction. Minor secondary details or technical terms were omitted."
                improvement_suggestions = "Strong answer. To achieve full marks, include specific technical definitions and supporting examples."
            else:
                lost_marks_reason = f"Deducted {lost_marks} mark(s) under moderate correction. Certain key requirements from teacher notes/rubric were not fully addressed."
                improvement_suggestions = "Review the teacher notes and focus on addressing each core rubric criterion."

        # Compute AI confidence score
        ai_conf = 0.92
        if contradictions:
            ai_conf = 0.70  # Flag lower confidence for teacher review when contradictions detected
        elif len(student_clean.split()) < 10:
            ai_conf = 0.78
            
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
