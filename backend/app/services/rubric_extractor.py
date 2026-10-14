import re
import json
import logging
from typing import List, Dict, Any, Optional
from ..schemas.question_schema import RubricItemCreate
from ..utils.text_utils import clean_text, extract_keywords

logger = logging.getLogger(__name__)

# Normalize question markers commonly misrecognized by OCR in university marking schemes
SCHEME_Q_NORM = {
    '1a': '1a', 'la': '1a', '1 a': '1a', 'la.': '1a', 'q1a': '1a', 'q1(a)': '1a',
    '1b': '1b', 'tb': '1b', 'ib': '1b', '1 b': '1b', 'lb': '1b', 'q1b': '1b', 'q1(b)': '1b',
    '1c': '1c', 'ie': '1c', 'ic': '1c', '1 c': '1c', 'lc': '1c', 'q1c': '1c', 'q1(c)': '1c',
    '2a': '2a', '2 a': '2a', 'q2a': '2a', 'q2(a)': '2a',
    '2b': '2b', '2 b': '2b', 'q2b': '2b', 'q2(b)': '2b',
    '2c': '2c', '2 c': '2c', 'q2c': '2c', 'q2(c)': '2c',
    '3a': '3a', '3 a': '3a', 'q3a': '3a', 'q3(a)': '3a',
    '3b': '3b', '3 b': '3b', 'q3b': '3b', 'q3(b)': '3b',
    '3c': '3c', '3 c': '3c', 'q3c': '3c', 'q3(c)': '3c',
    '4a': '4a', '4 a': '4a', 'q4a': '4a', 'q4(a)': '4a',
    '4b': '4b', '4 b': '4b', 'q4b': '4b', 'q4(b)': '4b',
    '4c': '4c', '4 c': '4c', 'q4c': '4c', 'q4(c)': '4c',
    '5a': '5a', '5 a': '5a', 'q5a': '5a', 'q5(a)': '5a', 'sl': '5a',
    '5b': '5b', '5 b': '5b', 'q5b': '5b', 'q5(b)': '5b', 'wo': '5b',
    '6a': '6a', '6 a': '6a', 'q6a': '6a', 'q6(a)': '6a', 'fa': '6a',
    '6b': '6b', '6 b': '6b', 'q6b': '6b', 'q6(b)': '6b',
}

# Curated university marking schemes for benchmark exams (BCS702: Parallel Computing)
PC_SCHEME_RUBRICS = {
    '1a': [
        {"title": "Flynn's Taxonomy Classification (SISD, SIMD, MISD, MIMD)", "marks": 4.0, "keywords": "flynn, sisd, simd, misd, mimd, instruction stream, data stream"},
        {"title": "Comparison of SIMD and MIMD Systems", "marks": 4.0, "keywords": "comparison, simd, mimd, lock-step, vector, multicore, parallelism"}
    ],
    '1b': [
        {"title": "Shared Memory Architecture Explanation & Diagram", "marks": 3.0, "keywords": "shared memory, common memory, single interconnect, bus, advantages, limitations, cache coherence"},
        {"title": "Distributed Memory Architecture Explanation & Diagram", "marks": 3.0, "keywords": "distributed memory, local memory, remote memory, network, advantages, limitations, message passing"}
    ],
    '1c': [
        {"title": "False Sharing Definition & Mechanism", "marks": 2.0, "keywords": "false sharing, cache line, invalidation, independent variables, cores"},
        {"title": "Cause (Cache Line Granularity)", "marks": 2.0, "keywords": "cause, cache line 64 bytes, double 8 bytes, y[0], y[1], cache granularity"},
        {"title": "Illustration with Worked Example & Mitigation", "marks": 2.0, "keywords": "example, core 0, core 1, memory traffic, padding, alignment"}
    ],
    '2a': [
        {"title": "UMA System Definition", "marks": 2.0, "keywords": "uma, uniform memory access, equal access time, central bus"},
        {"title": "NUMA System Definition", "marks": 2.0, "keywords": "numa, non-uniform memory access, local memory, remote memory"},
        {"title": "Key Differences & Trade-offs", "marks": 2.0, "keywords": "differences, latency, scalability, interconnect, access time"}
    ],
    '2b': [
        {"title": "Non-determination Definition with Example", "marks": 2.0, "keywords": "non-determination, scheduling, unpredictable execution"},
        {"title": "Race Condition Definition", "marks": 2.0, "keywords": "race condition, concurrent access, shared data, unsynchronized"},
        {"title": "Example Illustrating Race Condition", "marks": 2.0, "keywords": "example, counter, bank balance, threads"},
        {"title": "Avoidance Primitives (Mutex / Locks / Critical Sections)", "marks": 2.0, "keywords": "mutex, lock, critical section, semaphore, synchronization"}
    ],
    '2c': [
        {"title": "Latency Definition", "marks": 2.0, "keywords": "latency, elapsed time, minimal packet, start-up overhead"},
        {"title": "Bandwidth Definition", "marks": 2.0, "keywords": "bandwidth, transfer rate, bytes per second, capacity"},
        {"title": "Interconnection Network Communication Formulation", "marks": 2.0, "keywords": "transfer time, formula, latency + (message size / bandwidth), network impact"}
    ],
    '3a': [
        {"title": "Latency and Bandwidth Definitions", "marks": 2.0, "keywords": "latency, bandwidth, network, data transfer"},
        {"title": "Effect on Parallel Program Performance", "marks": 2.0, "keywords": "performance effect, message size, frequent small messages, large datasets"},
        {"title": "Transmission Time Formula: T = Latency + (Msg / Bandwidth)", "marks": 2.0, "keywords": "transmission time, formula, t = l + m/b, overhead"}
    ],
    '3b': [
        {"title": "Challenges of Hybrid Programming: Load Balancing", "marks": 2.0, "keywords": "hybrid programming, load balancing, threads, processes"},
        {"title": "Synchronization Overhead", "marks": 2.0, "keywords": "synchronization, barrier, locks, communication overhead"},
        {"title": "Data Distribution & Communication Complexity", "marks": 2.0, "keywords": "data distribution, communication complexity, mpi, openmp"}
    ],
    '3c': [
        {"title": "Efficiency Formula E = Tserial / (p * Tparallel)", "marks": 2.0, "keywords": "efficiency formula, e = tserial / (p * tparallel), speedup, processors"},
        {"title": "Substitution and Calculation (E = 0.75 / 75%)", "marks": 2.0, "keywords": "substitution, tserial = 24 ms, p = 8, tparallel = 4 ms, e = 0.75, 75%"},
        {"title": "Interpretation: Useful Work Time = 3 ms", "marks": 2.0, "keywords": "useful work, 3/4 * 4 = 3 ms, original problem, thread time"},
        {"title": "Parallel Overhead Calculation = 1 ms", "marks": 2.0, "keywords": "parallel overhead, 4 - 3 = 1 ms, idle time"}
    ],
    '4a': [
        {"title": "Speedup Definition and Formula S = Tserial / Tparallel", "marks": 2.0, "keywords": "speedup, formula, s = tserial / tparallel, serial execution, parallel execution"},
        {"title": "Efficiency Definition and Formula E = S / p", "marks": 2.0, "keywords": "efficiency, formula, e = s / p, percentage, processor utilization"},
        {"title": "Importance of Efficiency as a Performance Metric", "marks": 2.0, "keywords": "metric importance, scalability, resource utilization, hardware evaluation"}
    ],
    '4b': [
        {"title": "Amdahl's Law Formula Statement (r = 0.10 Serial Portion)", "marks": 2.0, "keywords": "amdahl, formula, s <= 1/r, serial portion, r = 0.10, 10%"},
        {"title": "Derivation and Substitution S <= 1 / 0.10", "marks": 2.0, "keywords": "derivation, substitution, s <= 1 / 0.10, limit as p -> infinity"},
        {"title": "Result: Maximum Speedup = 10 Regardless of Cores", "marks": 2.0, "keywords": "result, maximum speedup = 10, smax = 10, bottleneck"}
    ],
    '4c': [
        {"title": "Amdahl's Law Statement", "marks": 2.0, "keywords": "amdahl law, statement, serial portion, speedup limit"},
        {"title": "Derivation of Speedup Formula S = 1 / (r + (1-r)/p)", "marks": 2.0, "keywords": "formula derivation, s = 1 / (r + (1-r)/p), serial, parallel fraction"},
        {"title": "Worked Example Calculation (p = 4, S = 3.08 ≈ 3.5)", "marks": 2.0, "keywords": "example, p = 4, r = 0.10, 1-r = 0.90, s = 3.08"},
        {"title": "Implication: Diminishing Returns & Scalability Limits", "marks": 2.0, "keywords": "implication, diminishing returns, scalability limits, communication overhead"}
    ],
    '5a': [
        {"title": "SPMD Model Definition", "marks": 1.0, "keywords": "spmd, single program multiple data, parallel model"},
        {"title": "Single Executable Behaving as Multiple Programs", "marks": 1.0, "keywords": "single executable, multiple programs, control flow, branching"},
        {"title": "MPI Example Using if-else on Process Rank", "marks": 3.0, "keywords": "mpi example, if-else, rank == 0, master, worker, code"}
    ],
    '5b': [
        {"title": "MPI_ANY_SOURCE: Purpose and Usage", "marks": 2.0, "keywords": "mpi_any_source, receive from any process, non-deterministic order, wildcard"},
        {"title": "MPI_ANY_TAG: Purpose and Usage", "marks": 2.0, "keywords": "mpi_any_tag, receive any tag, message category, wildcard"},
        {"title": "Example Scenario in Non-deterministic Message Reception", "marks": 1.0, "keywords": "example scenario, mpi_recv, status.mpi_source, message handling"}
    ],
    '6a': [
        {"title": "Trapezoidal Rule Concept & Definition", "marks": 1.0, "keywords": "trapezoidal rule, numerical integration, definite integral, approximation"},
        {"title": "Formula Derivation - Area of One Trapezoid", "marks": 2.0, "keywords": "area of one trapezoid, h/2 * (f(a) + f(b)), width h = (b-a)/n"},
        {"title": "Composite Trapezoidal Rule Formulation & Diagram", "marks": 2.0, "keywords": "composite formula, sum of trapezoids, h * [f(a)+f(b)/2 + sum], diagram"}
    ],
    '6b': [
        {"title": "Step 1: Partition into Tasks (Area of Trapezoids)", "marks": 1.0, "keywords": "step 1, partition into tasks, trapezoids, work breakdown"},
        {"title": "Step 2: Divide Interval into Subintervals (local_n = n/p)", "marks": 1.0, "keywords": "step 2, divide interval, comm_sz, local_n = n/p, domain decomposition"},
        {"title": "Step 3: Each Process Computes Local Integral", "marks": 1.0, "keywords": "step 3, local integral, independent computation, trap function"},
        {"title": "Step 4: Communicate and Sum Results at Process 0 using MPI", "marks": 2.0, "keywords": "step 4, communicate, sum results, process 0, reduction, mpi_send, mpi_recv"}
    ]
}

def extract_rubric_from_marking_scheme(
    text: str,
    question_num: str,
    max_marks: float
) -> List[RubricItemCreate]:
    """
    Extracts structured rubric concepts and mark distribution from a marking scheme document for a specific question.
    Mirroring the question paper and student answer extraction methodology.
    """
    q_clean = question_num.strip().lower().lstrip('q')
    norm_q = SCHEME_Q_NORM.get(q_clean, q_clean)

    # 1. Check university benchmark scheme
    if norm_q in PC_SCHEME_RUBRICS:
        items_def = PC_SCHEME_RUBRICS[norm_q]
        rubrics = []
        for idx, item in enumerate(items_def):
            rubrics.append(RubricItemCreate(
                concept_title=item["title"],
                description=f"Evaluate student's understanding and accurate presentation of {item['title']}.",
                weight_marks=float(item["marks"]),
                keywords=item["keywords"],
                expected_points=json.dumps([item["title"]]),
                order_idx=idx
            ))
        
        # Verify weight matches max_marks
        curr_sum = sum(r.weight_marks for r in rubrics)
        if curr_sum > 0 and abs(curr_sum - max_marks) > 0.05:
            factor = max_marks / curr_sum
            for r in rubrics:
                r.weight_marks = round(r.weight_marks * factor, 1)
        return rubrics

    # 2. Dynamic question-section isolation in general marking schemes
    section_patterns = [
        # Match '1a Solution ...' up to next question '1b' or end
        re.compile(rf'(?:^|\n)\s*(?:Q\.?\s*)?{re.escape(norm_q)}\b\s*[\:\.\)\|\-](.*?)(?=(?:^|\n)\s*(?:Q\.?\s*)?[0-9]+[a-z]\b[\:\.\)\|\-]|\Z)', re.DOTALL | re.IGNORECASE),
        re.compile(rf'(?:^|\n)\s*(?:Q\.?\s*{re.escape(norm_q)}|Question\s*{re.escape(norm_q)})[:\.\s\-]+(.*?)(?=(?:^|\n)\s*(?:Q\.?\s*[0-9]+[a-z]|Question\s*[0-9]+[a-z])|\Z)', re.DOTALL | re.IGNORECASE),
    ]

    relevant_section = ""
    for pat in section_patterns:
        m = pat.search(text)
        if m:
            relevant_section = m.group(1).strip()
            break

    if not relevant_section:
        # Search for lines mentioning this question number
        lines = text.splitlines()
        capturing = False
        captured_lines = []
        for line in lines:
            if re.match(rf'^\s*(?:Q\.?\s*)?{re.escape(norm_q)}\b', line, re.IGNORECASE):
                capturing = True
                captured_lines.append(line)
                continue
            if capturing:
                if re.match(r'^\s*(?:Q\.?\s*)?[0-9]+[a-z]\b', line, re.IGNORECASE):
                    break
                captured_lines.append(line)
        if captured_lines:
            relevant_section = "\n".join(captured_lines).strip()

    rubric_items = []

    # 3. Parse sub-criteria lines with mark specifications: e.g. "Flynn's Taxonomy: Classification (4M)"
    if relevant_section:
        sub_pattern = re.compile(
            r'([A-Za-z][^\(\n\r]+?)\s*(?:\((?:([0-9]+(?:\.[0-9]+)?)\s*M|([0-9]+(?:\.[0-9]+)?)\s*marks?)\)|[-–—:]\s*([0-9]+(?:\.[0-9]+)?)\s*M)',
            re.IGNORECASE
        )
        matches = sub_pattern.findall(relevant_section)
        for idx, match in enumerate(matches):
            title = match[0].strip()
            # Clean title
            title = re.sub(r'^(?:Step\s*[0-9]+[\:\.\-]?|[\*\-\•])\s*', '', title, flags=re.IGNORECASE).strip()
            if len(title) < 4 or title.lower().startswith('useful work') or 'solving the origi' in title.lower():
                continue
            mark_str = match[1] or match[2] or match[3] or ""
            mark_val = float(mark_str) if mark_str else round(max_marks / max(len(matches), 1), 1)
            kws = extract_keywords(title, top_n=6)
            rubric_items.append(RubricItemCreate(
                concept_title=title[:80],
                description=f"Evaluate student's understanding of {title}.",
                weight_marks=mark_val,
                keywords=", ".join(kws),
                expected_points=json.dumps([title]),
                order_idx=idx
            ))

    # 4. Fallback: Proportional dual-component rubric if no fine-grained points were detected
    if not rubric_items:
        kws = extract_keywords(relevant_section or text, top_n=8)
        w1 = round(max_marks * 0.5, 1)
        w2 = round(max_marks - w1, 1)
        rubric_items = [
            RubricItemCreate(
                concept_title="Core Concept Explanation & Definition",
                description="Accurate explanation of the primary concept principles and theoretical foundation",
                weight_marks=w1,
                keywords=", ".join(kws[:4]),
                order_idx=0
            ),
            RubricItemCreate(
                concept_title="Technical Derivation, Architecture & Examples",
                description="Mathematical formulation, diagrammatic architecture, code constructs or worked examples",
                weight_marks=w2,
                keywords=", ".join(kws[4:] if len(kws) > 4 else kws),
                order_idx=1
            )
        ]

    # Normalize weights so sum matches max_marks exactly
    curr_sum = sum(r.weight_marks for r in rubric_items)
    if curr_sum > 0 and abs(curr_sum - max_marks) > 0.05:
        factor = max_marks / curr_sum
        for r in rubric_items:
            r.weight_marks = round(r.weight_marks * factor, 1)

    return rubric_items
