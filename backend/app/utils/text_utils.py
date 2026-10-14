import re
import math
from typing import List, Dict, Tuple, Set

# Negation and contradiction indicators
NEGATION_WORDS = {
    "not", "never", "no", "neither", "nor", "none", "hardly", "scarcely",
    "barely", "cannot", "can't", "won't", "doesn't", "don't", "didn't",
    "isn't", "aren't", "wasn't", "weren't", "fails", "failed", "opposite",
    "incorrect", "false", "untrue", "without", "lacks", "inability"
}

# Common antonym / opposite polarity pairs in technical & academic concepts
COMMON_ANTONYM_PAIRS = [
    ("synchronous", "asynchronous"),
    ("preemptive", "non-preemptive"),
    ("no preemption", "preemption"),
    ("circular", "linear"),
    ("circular wait", "linear wait"),
    ("deadlock", "starvation"),
    ("volatile", "non-volatile"),
    ("symmetric", "asymmetric"),
    ("lossy", "lossless"),
    ("increase", "decrease"),
    ("aerobic", "anaerobic"),
    ("prokaryotic", "eukaryotic"),
    ("dominant", "recessive"),
    ("static", "dynamic"),
    ("monolithic", "microkernel"),
    ("linear", "non-linear"),
    ("mutable", "immutable"),
    ("compiler", "interpreter"),
    ("dense", "sparse"),
    ("positive", "negative")
]

def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    text = re.sub(r'\r\n|\r', '\n', text)
    lines = [l.strip() for l in text.split('\n')]
    cleaned = '\n'.join(lines)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()

def tokenize_words(text: str) -> List[str]:
    """Tokenize text into lowercase alphanumeric words."""
    if not text:
        return []
    return re.findall(r'\b[a-zA-Z0-9_\-\']+\b', text.lower())

def extract_keywords(text: str, top_n: int = 15) -> List[str]:
    """Extract prominent non-stopword tokens."""
    stop_words = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with",
        "by", "about", "against", "between", "into", "through", "during", "before",
        "after", "above", "below", "from", "up", "down", "of", "off", "over", "under",
        "again", "further", "then", "once", "here", "there", "when", "where", "why",
        "how", "all", "any", "both", "each", "few", "more", "most", "other", "some",
        "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very",
        "s", "t", "can", "will", "just", "don", "should", "now", "is", "are", "was",
        "were", "be", "been", "being", "have", "has", "had", "having", "do", "does", "did",
        "what", "which", "who", "whom", "this", "that", "these", "those", "am", "it", "its"
    }
    words = [w for w in tokenize_words(text) if len(w) > 2 and w not in stop_words]
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [w[0] for w in sorted_words[:top_n]]

def detect_contradictions(student_text: str, expected_concept: str, keywords: List[str] = None) -> List[Dict[str, str]]:
    """
    Detect likely contradictions or negation polarity flips between student answer and expected rubric concepts.
    """
    contradictions = []
    student_lower = student_text.lower()
    concept_lower = expected_concept.lower()
    
    # 1. Antonym / Inverted polarity check
    for term1, term2 in COMMON_ANTONYM_PAIRS:
        if (term1 in concept_lower and term2 in student_lower) and (term1 not in student_lower):
            contradictions.append({
                "type": "antonym_polarity_flip",
                "detected": f"Student mentions '{term2}' while rubric specifically expects '{term1}'.",
                "severity": "high"
            })
        elif (term2 in concept_lower and term1 in student_lower) and (term2 not in student_lower):
            contradictions.append({
                "type": "antonym_polarity_flip",
                "detected": f"Student mentions '{term1}' while rubric specifically expects '{term2}'.",
                "severity": "high"
            })
            
    # 2. Negation prefix check around key concept words
    if keywords:
        for kw in keywords:
            kw_clean = kw.strip().lower()
            if not kw_clean or len(kw_clean) < 3:
                continue
            # Regex to find negation word within 3 words before keyword in student text
            pattern = rf'\b({"|".join(NEGATION_WORDS)})\b(?:\s+\w+){{0,3}}\s+\b{re.escape(kw_clean)}\b'
            neg_match = re.search(pattern, student_lower)
            if neg_match and not re.search(pattern, concept_lower):
                contradictions.append({
                    "type": "negated_concept",
                    "detected": f"Student states negation '{neg_match.group(0)}' regarding expected concept '{kw_clean}'.",
                    "severity": "medium"
                })

    return contradictions

def compute_keyword_overlap(student_text: str, expected_keywords: List[str]) -> Tuple[float, List[str], List[str]]:
    """
    Computes fraction of expected keywords found in student text.
    Returns (overlap_ratio, found_keywords, missed_keywords).
    """
    if not expected_keywords:
        return 1.0, [], []
    
    student_tokens = set(tokenize_words(student_text))
    found = []
    missed = []
    
    for kw in expected_keywords:
        kw_clean = kw.strip().lower()
        if not kw_clean:
            continue
        # Support multi-word phrases, decimal numbers, or single words
        if (" " in kw_clean) or ("." in kw_clean) or (kw_clean in student_text.lower()):
            if kw_clean in student_text.lower():
                found.append(kw)
            else:
                missed.append(kw)
        else:
            if kw_clean in student_tokens:
                found.append(kw)
            else:
                missed.append(kw)
                
    total = len(found) + len(missed)
    ratio = len(found) / total if total > 0 else 0.0
    return ratio, found, missed

def calculate_tf_idf_similarity(text1: str, text2: str) -> float:
    """
    Fast fallback cosine similarity using TF vectors if heavy transformer is not loaded.
    """
    tokens1 = tokenize_words(text1)
    tokens2 = tokenize_words(text2)
    if not tokens1 or not tokens2:
        return 0.0
    
    all_tokens = set(tokens1).union(set(tokens2))
    vec1 = {t: tokens1.count(t) for t in all_tokens}
    vec2 = {t: tokens2.count(t) for t in all_tokens}
    
    dot = sum(vec1[t] * vec2[t] for t in all_tokens)
    norm1 = math.sqrt(sum(v * v for v in vec1.values()))
    norm2 = math.sqrt(sum(v * v for v in vec2.values()))
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)
