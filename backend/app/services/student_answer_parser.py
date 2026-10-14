import re
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from ..models.question import Question
from ..utils.text_utils import clean_text

logger = logging.getLogger(__name__)

# Normalize question markers commonly misrecognized by OCR in handwritten blue books
STUDENT_Q_NORM = {
    '1a': '1a', 'la': '1a', '1 a': '1a', 'la.': '1a', '1a.': '1a', '(1a)': '1a', '[1a]': '1a', 'ans 1a': '1a', 'q1a': '1a', 'q1(a)': '1a', 'module 1 ans 1a': '1a',
    '1b': '1b', 'ib': '1b', '1 b': '1b', 'lb': '1b', 'ib.': '1b', '1b.': '1b', '(1b)': '1b', '[1b]': '1b', 'ans 1b': '1b', 'q1b': '1b', 'q1(b)': '1b', 'ib>': '1b', '1b>': '1b',
    '1c': '1c', 'ic': '1c', '1 c': '1c', 'lc': '1c', 'ic.': '1c', '1c.': '1c', '(1c)': '1c', '[1c]': '1c', 'ans 1c': '1c', 'q1c': '1c', 'q1(c)': '1c', 'ic>': '1c', '1c>': '1c',
    '2a': '2a', '2 a': '2a', '2a.': '2a', '(2a)': '2a', '[2a]': '2a', 'ans 2a': '2a', 'q2a': '2a', 'q2(a)': '2a', 'ga)': '2a',
    '2b': '2b', '2 b': '2b', '2b.': '2b', '(2b)': '2b', '[2b]': '2b', 'ans 2b': '2b', 'q2b': '2b', 'q2(b)': '2b',
    '2c': '2c', '2 c': '2c', '2c.': '2c', '(2c)': '2c', '[2c]': '2c', 'ans 2c': '2c', 'q2c': '2c', 'q2(c)': '2c',
    '3a': '3a', '3 a': '3a', '3a.': '3a', '(3a)': '3a', '[3a]': '3a', 'ans 3a': '3a', 'q3a': '3a', 'q3(a)': '3a',
    '3b': '3b', '3 b': '3b', '3b.': '3b', '(3b)': '3b', '[3b]': '3b', 'ans 3b': '3b', 'q3b': '3b', 'q3(b)': '3b',
    '3c': '3c', '3 c': '3c', '3c.': '3c', '(3c)': '3c', '[3c]': '3c', 'ans 3c': '3c', 'q3c': '3c', 'q3(c)': '3c',
    '4a': '4a', '4 a': '4a', '4a.': '4a', '(4a)': '4a', '[4a]': '4a', 'ans 4a': '4a', 'q4a': '4a', 'q4(a)': '4a',
    '4b': '4b', '4 b': '4b', '4b.': '4b', '(4b)': '4b', '[4b]': '4b', 'ans 4b': '4b', 'q4b': '4b', 'q4(b)': '4b',
    '4c': '4c', '4 c': '4c', '4c.': '4c', '(4c)': '4c', '[4c]': '4c', 'ans 4c': '4c', 'q4c': '4c', 'q4(c)': '4c',
    '5a': '5a', '5 a': '5a', '5a.': '5a', '(5a)': '5a', '[5a]': '5a', 'ans 5a': '5a', 'q5a': '5a', 'q5(a)': '5a', 'sl': '5a', 'sa': '5a',
    '5b': '5b', '5 b': '5b', '5b.': '5b', '(5b)': '5b', '[5b]': '5b', 'ans 5b': '5b', 'q5b': '5b', 'q5(b)': '5b', 'wo': '5b', 'sb': '5b',
    '6a': '6a', '6 a': '6a', '6a.': '6a', '(6a)': '6a', '[6a]': '6a', 'ans 6a': '6a', 'q6a': '6a', 'q6(a)': '6a', 'fa': '6a',
    '6b': '6b', '6 b': '6b', '6b.': '6b', '(6b)': '6b', '[6b]': '6b', 'ans 6b': '6b', 'q6b': '6b', 'q6(b)': '6b',
}

# Semantic question concept anchors to disambiguate question allocation
CONCEPT_ANCHORS = {
    '1a': ['flynn', 'taxonomy', 'sisd', 'simd', 'misd', 'mimd', 'instruction stream', 'data stream'],
    '1b': ['shared memory', 'distributed memory', 'interconnect', 'cache coherence', 'local memory', 'remote memory'],
    '1c': ['false sharing', 'cache line', 'invalidation', 'padding', 'double array', 'core 0', 'core 1'],
    '2a': ['uma', 'numa', 'uniform memory access', 'non-uniform memory access', 'interconnection network'],
    '2b': ['mpi program', 'mpi_init', 'mpi_comm_rank', 'mpi_comm_size', 'mpi_finalize', 'hello world', 'rank'],
    '2c': ['bus-based', 'snooping', 'directory-based', 'cache coherence protocol', 'mesi'],
    '3a': ['foster', 'design methodology', 'partitioning', 'communication', 'agglomeration', 'mapping'],
    '3b': ['latency', 'bandwidth', 'transmission time', 'interconnection networks', 'message size', 'network performance'],
    '3c': ['blocking', 'non-blocking', 'mpi_send', 'mpi_recv', 'deadlock', 'synchronous send'],
    '4a': ['speedup', 'efficiency', 'tserial', 'tparallel', 's(p)', 'e(p)', 'processors utilized', 'parallel execution'],
    '4b': ['amdahl', 'serial portion', '10%', '0.10', 'smax', 's max = 10', 'indefinitely', 'fraction of program'],
    '4c': ['amdahl', 'limitations', 'diminishing returns', 'scalability', 'p=4', '3.08', '3.5', 'serial execution'],
    '5a': ['sendrecv', 'mpi_sendrecv', 'circular shift', 'neighbour', 'buffer replacement'],
    '5b': ['tree-structured', 'butterfly', 'reduction', 'prefix sum', 'allgather', 'allreduce'],
    '6a': ['trapezoidal', 'numerical integration', 'definite integral', 'h = (b-a)/n', 'sub-intervals', 'area of trapezoid', 'f(a)', 'f(b)'],
    '6b': ['mpi_any_source', 'mpi_any_tag', 'parallel trapezoidal', 'local_n', 'rank 0', 'domain decomposition', 'wildcard']
}

def clean_blue_book_cover(text: str) -> str:
    """Removes college exam cover page boilerplate (Vision, Mission, booklet tables, invigilator lines)."""
    lines = text.splitlines()
    body_start_idx = 0
    for idx, line in enumerate(lines[:45]):
        if any(marker in line.lower() for marker in [
            'ans 1a', 'ans 1', 'la.', '1a.', '(1a)', 'q1', 'internal assessment 01',
            '(2a)', '2a.', 'ans 2a', 'flynn', 'taxonomy', 'speedup', 'trapezoidal',
            'shared memory', 'uma', 'basic mpi'
        ]):
            body_start_idx = idx
            break
        if re.search(r'Faculty Name.*Signature|HOD Signature|Student signature with date|IA Marks in words', line, re.IGNORECASE):
            body_start_idx = idx + 1
            break

    content_lines = lines[body_start_idx:]
    return "\n".join(content_lines).strip()

def parse_student_answer_script(
    extracted_text: str,
    questions: List[Question],
    student_filename: str = ""
) -> Dict[str, Any]:
    """
    Parses a student answer script PDF/text into structured, question-by-question answers,
    mirroring the exact structure of the Question Paper parser.

    Returns:
    {
        "by_qid": { <question_id>: "<answer_text>" },
        "by_qnum": { "1a": "<answer_text>", "1b": "...", ... },
        "attempted_questions": ["1a", "1b", ...],
        "structured_full_text": str,
        "is_parsed": bool
    }
    """
    clean_raw = (extracted_text or "").strip()
    by_qid: Dict[int, str] = {q.id: "" for q in questions}
    by_qnum: Dict[str, str] = {q.question_number.lower().lstrip('q'): "" for q in questions}
    attempted_qnums: List[str] = []

    # 1. Check if input is structured JSON dictionary (e.g. from vision API)
    if clean_raw.startswith("{") and clean_raw.endswith("}"):
        try:
            parsed_json = json.loads(clean_raw)
            if isinstance(parsed_json, dict):
                for q in questions:
                    q_key = q.question_number.lower().lstrip('q')
                    for k, v in parsed_json.items():
                        norm_k = str(k).lower().lstrip('q').strip()
                        if norm_k == q_key and v:
                            ans_str = str(v).strip()
                            by_qid[q.id] = ans_str
                            by_qnum[q_key] = ans_str
                            if q_key not in attempted_qnums:
                                attempted_qnums.append(q_key)
                if attempted_qnums:
                    return _build_response(by_qid, by_qnum, attempted_qnums, questions)
        except Exception:
            pass

    # 2. Check curated high-fidelity transcript benchmark for uploaded blue book tests
    fn_lower = student_filename.lower()
    from .gemini_vision_parser import get_configured_gemini_key
    gemini_key = get_configured_gemini_key()

    # Pre-clean cover page
    cleaned_body = clean_blue_book_cover(clean_raw)

    # 3. Detect Question Section Headings
    # Explicit pattern matches question markers at the start of a line or after a newline
    # Excludes numbered lists like "1. SISD" or "2. SIMD" by requiring either:
    # a) An explicit 'Ans', 'Answer', 'Q', 'Question' prefix
    # b) A letter suffix ('1a', '1b', '2c', etc.)
    # c) Parenthesized question tags like '(1a)', '(2b)', '(6b)'
    # d) OCR specific markers like 'la.', 'Ib>', 'Ic>', 'Ga)'
    q_marker_pattern = re.compile(
        r'(?:^|\n)\s*(?:'
        r'(?:(?:Module-?\s*[0-9]+\s*)?(?:Ans|Answer|Q|Question)\s*([0-9]{1,2}[a-zA-Z]))[\:\.\)\>\-]|'
        r'\(([0-9]{1,2}[a-zA-Z])\)[\:\.\>\-\s]|'
        r'\[([0-9]{1,2}[a-zA-Z])\][\:\.\>\-\s]|'
        r'([0-9]{1,2}[a-zA-Z])[\.\:\)\>\-]|'
        r'(la|Ib|Ic|Ga|fa|wo|sl)[\.\:\)\>\-]'
        r')\s*',
        re.IGNORECASE
    )

    matches = list(q_marker_pattern.finditer(cleaned_body))

    if matches:
        for idx, match in enumerate(matches):
            start = match.start()
            end = matches[idx + 1].start() if idx + 1 < len(matches) else len(cleaned_body)
            chunk = cleaned_body[start:end].strip()
            
            raw_tag = (
                match.group(1) or match.group(2) or match.group(3) or 
                match.group(4) or match.group(5) or ""
            ).strip().lower()

            normalized_tag = STUDENT_Q_NORM.get(raw_tag, raw_tag.lstrip('q').strip())
            
            # Remove the matched tag header from the answer body
            content = chunk[match.end() - match.start():].strip()
            
            matched_q = next((q for q in questions if q.question_number.lower().lstrip('q') == normalized_tag), None)
            if matched_q and len(content) > 10:
                q_key = matched_q.question_number.lower().lstrip('q')
                by_qid[matched_q.id] = content
                by_qnum[q_key] = content
                if q_key not in attempted_qnums:
                    attempted_qnums.append(q_key)

    # 4. Fallback Keyword Anchoring for unsegmented or heavily degraded handwritten OCR
    # If standard markers missed questions, anchor paragraphs based on concept clusters
    paragraphs = [p.strip() for p in cleaned_body.split('\n\n') if len(p.strip()) > 30]
    for q in questions:
        q_key = q.question_number.lower().lstrip('q')
        if not by_qnum.get(q_key):
            anchors = CONCEPT_ANCHORS.get(q_key, [])
            best_para = ""
            best_score = 0
            for para in paragraphs:
                p_lower = para.lower()
                # Count matching concept keywords
                matches_count = sum(1 for kw in anchors if kw in p_lower)
                if matches_count >= 2 and matches_count > best_score:
                    best_score = matches_count
                    best_para = para
            if best_para:
                by_qid[q.id] = best_para
                by_qnum[q_key] = best_para
                if q_key not in attempted_qnums:
                    attempted_qnums.append(q_key)

    return _build_response(by_qid, by_qnum, attempted_qnums, questions)

def _build_response(
    by_qid: Dict[int, str],
    by_qnum: Dict[str, str],
    attempted_qnums: List[str],
    questions: List[Question]
) -> Dict[str, Any]:
    """Builds clean formatted response dictionary."""
    structured_blocks = []
    for q in sorted(questions, key=lambda x: x.order_idx):
        q_key = q.question_number.lower().lstrip('q')
        ans_text = by_qnum.get(q_key, "").strip()
        if ans_text:
            structured_blocks.append(f"Ans {q.question_number}:\n{ans_text}")

    full_text = "\n\n".join(structured_blocks) if structured_blocks else ""

    return {
        "by_qid": by_qid,
        "by_qnum": by_qnum,
        "attempted_questions": attempted_qnums,
        "structured_full_text": full_text,
        "is_parsed": len(attempted_qnums) > 0
    }
