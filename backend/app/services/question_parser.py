import re
from typing import List, Dict, Any
from ..schemas.question_schema import ParsedQuestionItem
from ..utils.text_utils import clean_text, extract_keywords

# Common patterns for question numbering with optional leading whitespace
QUESTION_PATTERN = re.compile(
    r'(?:^|\n)[ \t]*(?:(?:Question|Q|Q\.)\s*([0-9]+[a-zA-Z]?|[a-zA-Z])[:\.\)]|(?:[0-9]+|[a-zA-Z])[\.\)])\s*',
    re.IGNORECASE
)

# Common patterns for maximum marks in parentheses/brackets
MARKS_PATTERN = re.compile(
    r'(?:\[|\()(?:\s*(?:Total\s*:\s*)?([0-9]+(?:\.[0-9]+)?)\s*(?:marks?|pts?|points?|M))\s*(?:\]|\))',
    re.IGNORECASE
)

def parse_question_paper_text(raw_text: str) -> List[ParsedQuestionItem]:
    """
    Parses raw text extracted from a question paper into structured Question items.
    """
    cleaned = clean_text(raw_text)
    if not cleaned:
        return []

    lines = cleaned.split('\n')
    questions: List[ParsedQuestionItem] = []
    
    current_q_num = None
    current_text_chunks = []
    current_marks = 5.0  # default
    
    # Regex split to capture segments
    matches = list(QUESTION_PATTERN.finditer(cleaned))
    
    if not matches:
        # Fallback: Split by double newlines or numbered lines
        paragraphs = [p.strip() for p in cleaned.split('\n\n') if p.strip()]
        for i, p in enumerate(paragraphs):
            marks_match = MARKS_PATTERN.search(p)
            marks = float(marks_match.group(1)) if marks_match else 5.0
            # Clean marks tag from text
            q_text = MARKS_PATTERN.sub('', p).strip()
            keywords = extract_keywords(q_text, top_n=5)
            questions.append(ParsedQuestionItem(
                question_number=f"Q{i+1}",
                question_text=q_text,
                max_marks=marks,
                detected_concepts=keywords
            ))
        return questions

    for i, match in enumerate(matches):
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned)
        
        chunk = cleaned[start:end].strip()
        matched_tag = match.group(0).strip()
        
        # Determine clean Q-number
        # Check captured group or regex
        captured = match.group(1) or match.group(2) if match.lastindex and match.lastindex >= 2 else (match.group(1) if match.lastindex else None)
        if not captured:
            num_match = re.search(r'(?:Question|Q|Q\.)\s*([0-9]+[a-zA-Z]?|[a-zA-Z])|([0-9]+|[a-zA-Z])', matched_tag, re.IGNORECASE)
            captured = (num_match.group(1) or num_match.group(2)) if num_match else f"{i+1}"
        
        q_num = f"Q{captured}" if not str(captured).upper().startswith("Q") else str(captured).upper()
        
        # Remove the leading question label
        content = chunk[len(matched_tag):].strip()
        
        # Find marks specification
        marks_match = MARKS_PATTERN.search(content)
        if marks_match:
            marks = float(marks_match.group(1))
            content = MARKS_PATTERN.sub('', content).strip()
        else:
            marks = 5.0  # fallback standard question marks
            
        keywords = extract_keywords(content, top_n=6)
        
        questions.append(ParsedQuestionItem(
            question_number=q_num,
            question_text=content,
            max_marks=marks,
            detected_concepts=keywords
        ))
        
    return questions
