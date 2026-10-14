import re
import json
from typing import List, Dict, Any, Tuple

def infer_module_and_choice(q_num: str, q_text: str = "") -> Tuple[str, str, str]:
    """
    Infers module name, main question group, and choice group from question number and text.
    Standard university modular exam pattern:
      - Module 1: Q1 (1a, 1b, 1c) OR Q2 (2a, 2b, 2c) -> Max 20 marks
      - Module 2: Q3 (3a, 3b, 3c) OR Q4 (4a, 4b, 4c) -> Max 20 marks
      - Module 3: Q5 (5a, 5b)     OR Q6 (6a, 6b)     -> Max 10 or 20 marks
      - Module 4: Q7 (7a, 7b)     OR Q8 (8a, 8b)     -> Max 20 marks
      - Module 5: Q9 (9a, 9b)     OR Q10 (10a, 10b)   -> Max 20 marks

    If the question explicitly specifies a module in its prompt text (e.g. "Mod# 4", "Module 4"),
    that explicit module number is respected.
    """
    clean = q_num.strip().lower().replace("question", "").replace("q", "").strip()
    
    # 1. Determine main question number
    m = re.match(r'^([0-9]+)', clean)
    main_num = int(m.group(1)) if m else 1
    main_q = f"Q{main_num}"

    # 2. Check for explicit module tag in question text or label
    explicit_mod = None
    if q_text:
        m_mod = re.search(r'\b(?:Module|Mod)[\s\-\#]*([0-9]+)\b', q_text, re.IGNORECASE)
        if m_mod:
            explicit_mod = int(m_mod.group(1))
    
    # 3. Determine module index and choice partner
    if explicit_mod is not None:
        mod_idx = explicit_mod
        partner_num = main_num + 1 if (main_num % 2 == 1) else main_num - 1
        q_low = min(main_num, partner_num)
        q_high = max(main_num, partner_num)
        mod_name = f"Module {mod_idx}"
        choice_group = f"Module {mod_idx} (Q{q_low} or Q{q_high})"
    else:
        # Standard university formula: (num + 1) // 2
        mod_idx = (main_num + 1) // 2
        q_low = mod_idx * 2 - 1
        q_high = mod_idx * 2
        mod_name = f"Module {mod_idx}"
        choice_group = f"Module {mod_idx} (Q{q_low} or Q{q_high})"

    return (mod_name, main_q, choice_group)

def calculate_exam_max_marks(questions: List[Any]) -> float:
    """
    Computes effective max marks for the exam taking into account module choice caps.
    For an exam where each module has internal 'OR' options (e.g. Q1 OR Q2),
    each module contributes at most the max marks of one option (typically 20 marks).
    """
    modules_map: Dict[str, Dict[str, float]] = {}

    for q in questions:
        qn = getattr(q, 'question_number', str(q))
        qt = getattr(q, 'question_text', '')
        max_m = float(getattr(q, 'max_marks', 0.0))
        mod_name, main_q, _ = infer_module_and_choice(qn, qt)

        if mod_name not in modules_map:
            modules_map[mod_name] = {}
        modules_map[mod_name][main_q] = modules_map[mod_name].get(main_q, 0.0) + max_m

    effective_total = 0.0
    for mod_name, options in modules_map.items():
        # Each module max is the max marks of one option (e.g. max marks of Q1 or Q2)
        mod_max = max(options.values()) if options else 20.0
        effective_total += mod_max

    return round(effective_total, 2)

def evaluate_submission_modules(
    questions: List[Any],
    marks_by_qid: Dict[int, float],
    exam_total_marks: float,
    grace_marks: float = 0.0
) -> Dict[str, Any]:
    """
    Evaluates a student's submission enforcing module-wise OR choices.
    
    Rule:
    - In each module (e.g. Module 1: Q1 or Q2), the student has 2 options.
    - Each option has subparts (e.g. Q1: 1a, 1b, 1c; Q2: 2a, 2b, 2c).
    - If multiple options in the same module are attempted, the best-scoring option is awarded.
    - Only ONE option/part marks is considered toward the total exam marks.
    """
    modules_data: Dict[str, Dict[str, Any]] = {}

    for q in questions:
        mod_name, main_q, choice_group = infer_module_and_choice(q.question_number, getattr(q, 'question_text', ''))
        awarded = float(marks_by_qid.get(q.id, 0.0))
        q_max = float(getattr(q, 'max_marks', 0.0))

        if mod_name not in modules_data:
            modules_data[mod_name] = {
                "module_name": mod_name,
                "choice_group": choice_group,
                "options": {}
            }

        if main_q not in modules_data[mod_name]["options"]:
            modules_data[mod_name]["options"][main_q] = {
                "main_question": main_q,
                "awarded_marks": 0.0,
                "max_marks": 0.0,
                "subquestions": []
            }

        opt = modules_data[mod_name]["options"][main_q]
        opt["awarded_marks"] += awarded
        opt["max_marks"] += q_max
        opt["subquestions"].append({
            "question_id": q.id,
            "question_number": q.question_number,
            "awarded_marks": awarded,
            "max_marks": q_max
        })

    total_module_awarded = 0.0
    module_breakdown = {}

    for mod_name, m_info in modules_data.items():
        options = m_info["options"]
        if not options:
            continue

        # Find best-performing option in this module
        best_opt_name = None
        best_opt_score = -1.0
        best_opt_max = 20.0

        for opt_name, opt_data in options.items():
            if opt_data["awarded_marks"] > best_opt_score:
                best_opt_score = opt_data["awarded_marks"]
                best_opt_name = opt_name
                best_opt_max = opt_data["max_marks"]

        # Default to first option if all are 0
        if best_opt_name is None:
            best_opt_name = list(options.keys())[0]
            best_opt_score = 0.0
            best_opt_max = options[best_opt_name]["max_marks"]

        # Module score is the best option score
        mod_cap = max(best_opt_max, 1.0)
        capped_awarded = min(mod_cap, round(best_opt_score, 2))
        total_module_awarded += capped_awarded

        module_breakdown[mod_name] = {
            "module_name": mod_name,
            "choice_group": m_info["choice_group"],
            "module_max_marks": mod_cap,
            "awarded_marks": capped_awarded,
            "selected_option": best_opt_name,
            "selected_option_score": round(best_opt_score, 2),
            "options": {
                opt_name: {
                    "awarded": round(opt["awarded_marks"], 2),
                    "max": round(opt["max_marks"], 2),
                    "subparts": [sq["question_number"] for sq in opt["subquestions"]]
                }
                for opt_name, opt in options.items()
            }
        }

    # Total score capped at exam total marks
    final_exam_total = exam_total_marks if exam_total_marks > 0 else 50.0
    total_with_grace = min(final_exam_total, round(total_module_awarded + grace_marks, 2))
    percentage = round((total_with_grace / final_exam_total * 100), 1) if final_exam_total > 0 else 0.0

    return {
        "total_awarded_marks": total_with_grace,
        "percentage": percentage,
        "passed": False,  # Caller determines based on pass_marks
        "module_breakdown": module_breakdown
    }
