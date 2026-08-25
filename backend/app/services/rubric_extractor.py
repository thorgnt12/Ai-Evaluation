import re
import json
from typing import List, Dict, Any
from ..schemas.question_schema import RubricItemCreate
from ..utils.text_utils import clean_text, extract_keywords

def extract_rubric_from_marking_scheme(text: str, question_num: str, max_marks: float) -> List[RubricItemCreate]:
    """
    Extracts structured rubric concepts and mark distribution from a marking scheme document for a specific question.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return [
            RubricItemCreate(
                concept_title="Core Concept Understanding",
                description="Accurate explanation of the primary principle",
                weight_marks=round(max_marks * 0.6, 1),
                keywords="explanation, definition, principle",
                order_idx=0
            ),
            RubricItemCreate(
                concept_title="Examples & Technical Accuracy",
                description="Appropriate terminology, supporting examples, or step-by-step reasoning",
                weight_marks=round(max_marks * 0.4, 1),
                keywords="example, application, structure",
                order_idx=1
            )
        ]

    # Search for section corresponding to this question (e.g. Q1, Question 1, Marking Scheme 1)
    q_pattern = re.compile(
        rf'(?:^|\n)(?:Q\.?\s*{re.escape(question_num)}|Question\s*{re.escape(question_num)})[:\.\s\-]+(.*?)(?=(?:^|\n)(?:Q\.?\s*[0-9]+|Question\s*[0-9]+)|\Z)',
        re.DOTALL | re.IGNORECASE
    )
    match = q_pattern.search(cleaned)
    relevant_section = match.group(1).strip() if match else cleaned

    rubric_items = []
    # Look for bullet points with marks e.g. "- Definition: 2 marks", "1. Syntax and logic [2M]"
    bullet_pattern = re.compile(
        r'(?:^|\n)(?:[\*\-\•]|\d+[\.\)])\s*(.*?)(?:\s*(?:\[|\()([0-9]+(?:\.[0-9]+)?)\s*(?:marks?|pts?|points?|M)(?:\]|\))|\n|$)',
        re.IGNORECASE
    )
    bullets = bullet_pattern.findall(relevant_section)
    
    if bullets:
        for idx, (concept_desc, mark_val) in enumerate(bullets):
            concept_desc = concept_desc.strip()
            if not concept_desc:
                continue
            weight = float(mark_val) if mark_val else round(max_marks / max(len(bullets), 1), 1)
            kws = extract_keywords(concept_desc, top_n=6)
            rubric_items.append(RubricItemCreate(
                concept_title=concept_desc[:60] + ("..." if len(concept_desc) > 60 else ""),
                description=concept_desc,
                weight_marks=weight,
                keywords=", ".join(kws),
                expected_points=json.dumps([concept_desc]),
                order_idx=idx
            ))

    if not rubric_items:
        # Fallback automated concept chunking
        keywords = extract_keywords(relevant_section, top_n=8)
        rubric_items = [
            RubricItemCreate(
                concept_title="Primary Concept & Definition",
                description=f"Accurate understanding of {', '.join(keywords[:3]) if keywords else 'the subject'}",
                weight_marks=round(max_marks * 0.6, 1),
                keywords=", ".join(keywords[:4]),
                order_idx=0
            ),
            RubricItemCreate(
                concept_title="Technical Formulation & Details",
                description=f"Coverage of {', '.join(keywords[3:6]) if len(keywords) > 3 else 'supporting details'}",
                weight_marks=round(max_marks * 0.4, 1),
                keywords=", ".join(keywords[3:]),
                order_idx=1
            )
        ]

    # Normalize weights so sum matches max_marks if needed
    current_sum = sum(r.weight_marks for r in rubric_items)
    if current_sum > 0 and abs(current_sum - max_marks) > 0.1:
        factor = max_marks / current_sum
        for r in rubric_items:
            r.weight_marks = round(r.weight_marks * factor, 1)

    return rubric_items
