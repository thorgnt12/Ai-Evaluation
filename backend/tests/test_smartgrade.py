from app.utils.text_utils import (
    clean_text, tokenize_words, detect_contradictions, compute_keyword_overlap, calculate_tf_idf_similarity
)
from app.services.question_parser import parse_question_paper_text
from app.services.rubric_extractor import extract_rubric_from_marking_scheme
from app.services.ai_grader import ai_grader
from app.services.web_validator import web_validator
from app.models.question import Question, RubricItem
from app.models.exam import Exam
from app.models.submission import Submission
from app.models.evaluation import AnswerEvaluation
from app.services.export_service import generate_excel_marksheet, generate_student_pdf_report
from app.services.analytics_service import compute_class_analytics, compute_calibration_benchmark

def test_question_paper_parser():
    sample_qp = """
    CS101 Mid-Term Examination
    
    Question 1: Explain the concept of process scheduling and deadlock conditions. [10 Marks]
    
    Question 2: Describe virtual memory, page tables, and page fault handling. [10 Marks]
    
    Question 3: Compare monolithic vs microkernel operating system architectures. [5 Marks]
    """
    questions = parse_question_paper_text(sample_qp)
    assert len(questions) == 3
    assert questions[0].question_number == "Q1"
    assert questions[0].max_marks == 10.0
    assert "process scheduling" in questions[0].question_text
    assert questions[2].max_marks == 5.0

def test_contradiction_detection():
    expected_concept = "Deadlock requires circular wait and no preemption."
    student_flipped = "Deadlock occurs with preemption and linear wait."
    
    contras = detect_contradictions(student_flipped, expected_concept, ["preemption", "linear"])
    assert len(contras) > 0
    assert any("preemption" in c["detected"] or "linear" in c["detected"] for c in contras)

def test_negation_detection():
    expected_concept = "Virtual memory utilizes paging to isolate processes."
    student_negated = "Virtual memory does not utilize paging to isolate processes."
    
    contras = detect_contradictions(student_negated, expected_concept, ["paging", "isolate"])
    assert len(contras) > 0
    assert any(c["type"] == "negated_concept" for c in contras)

def test_scenario_a_grading():
    q = Question(
        id=1,
        exam_id=1,
        question_number="Q1",
        question_text="Explain the four Coffman conditions for deadlocks.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait."
    )
    q.rubric_items = [
        RubricItem(id=1, question_id=1, concept_title="Mutual Exclusion", weight_marks=2.5, keywords="mutual exclusion, non-shareable"),
        RubricItem(id=2, question_id=1, concept_title="Hold and Wait", weight_marks=2.5, keywords="hold, wait, resource"),
        RubricItem(id=3, question_id=1, concept_title="No Preemption", weight_marks=2.5, keywords="no preemption, voluntary release"),
        RubricItem(id=4, question_id=1, concept_title="Circular Wait", weight_marks=2.5, keywords="circular wait, chain, loop")
    ]

    student_ans = "The four conditions are mutual exclusion with non-shareable resources, hold and wait for resources, no preemption, and circular wait in a chain."
    res = ai_grader.grade_answer(q, student_ans, grading_mode="notes_grounded")
    
    assert res["awarded_marks"] >= 8.0
    assert len(res["strengths"]) > 0
    assert res["confidence_score"] >= 0.85

def test_option_1_moderate_correction_forgiving():
    """Option 1: Notes/Rubric with Moderate Correction - not overly strict, generous partial marks."""
    q = Question(
        id=3,
        exam_id=3,
        question_number="Q1",
        question_text="Explain deadlock in operating systems.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Deadlock is a state where processes wait indefinitely for resources held by each other."
    )
    # Informal student explanation that grasps concept without academic jargon
    student_ans = "Deadlock happens when processes get stuck waiting for resources that other processes are holding, so nobody can make progress."
    res = ai_grader.grade_answer(q, student_ans, grading_mode="notes_grounded", teacher_notes="Deadlock: processes waiting for resources in a circular cycle.")
    
    # Moderate correction should reward the student generously (>= 7.0 / 10) instead of failing them
    assert res["awarded_marks"] >= 7.0
    assert "Option 1" in res["lost_marks_reason"] or "moderate" in res["lost_marks_reason"].lower()

def test_option_2_lenient_web_search_without_rubric():
    """Option 2: Answersheet + Question Paper ONLY - Web Search + Lenient Correction."""
    q = Question(
        id=4,
        exam_id=4,
        question_number="Q1",
        question_text="Explain gradient descent in machine learning.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer=""  # No model answer provided!
    )
    q.rubric_items = []  # No rubric provided!
    
    # Student gives intuitive answer
    student_ans = "Gradient descent is an optimization algorithm that minimizes the loss function by taking iterative steps in the direction of negative gradient."
    res = ai_grader.grade_answer(q, student_ans, grading_mode="rubric_web_validated")
    
    # Must retrieve web evidence and award lenient full/high marks
    assert len(res["web_evidence"]) > 0
    assert res["awarded_marks"] >= 8.5
    assert any("wikipedia" in ev["domain"] or "duckduckgo" in ev["domain"] or "academic" in ev["source_title"].lower() for ev in res["web_evidence"])
    assert "Option 2" in res["lost_marks_reason"] or "lenient" in res["lost_marks_reason"].lower()

def test_scenario_b_web_validation():
    q = Question(
        id=2,
        exam_id=2,
        question_number="Q1",
        question_text="Explain photosynthesis light reactions and Calvin cycle.",
        max_marks=10.0,
        grading_type="concept_coverage",
        model_answer="Light reactions in thylakoids; Calvin cycle in stroma with RuBisCO."
    )
    q.rubric_items = [
        RubricItem(id=5, question_id=2, concept_title="Light Reactions (Thylakoids)", weight_marks=5.0, keywords="thylakoid, chlorophyll, photon, ATP, NADPH"),
        RubricItem(id=6, question_id=2, concept_title="Calvin Cycle (Stroma)", weight_marks=5.0, keywords="calvin cycle, stroma, RuBisCO, glucose")
    ]

    student_ans = "Photosynthesis takes place in chloroplasts. Light reactions in thylakoids produce ATP and NADPH. The Calvin cycle in the stroma uses RuBisCO to produce glucose."
    res = ai_grader.grade_answer(q, student_ans, grading_mode="rubric_web_validated")

    assert res["awarded_marks"] >= 8.5
    assert len(res["web_evidence"]) > 0
    assert any("wikipedia.org" in ev["domain"] or "britannica.com" in ev["domain"] for ev in res["web_evidence"])

def test_excel_and_pdf_generation():
    exam = Exam(
        id=10,
        title="Software Engineering Final",
        subject="Computer Science",
        exam_code="SE401",
        total_marks=20.0,
        pass_marks=8.0,
        term="Spring 2026",
        grace_marks=0.0,
        grading_mode="notes_grounded",
        status="finalized"
    )
    q = Question(id=1, exam_id=10, question_number="Q1", question_text="Explain Agile SDLC.", max_marks=20.0, grading_type="concept_coverage", order_idx=0)
    exam.questions = [q]

    sub = Submission(
        id=100,
        exam_id=10,
        student_roll="21CS999",
        student_name="Test Student",
        student_email="test@student.edu",
        original_filename="21CS999.pdf",
        file_path="/tmp/21CS999.pdf",
        ocr_confidence=95.0,
        is_ocr_verified=True,
        total_awarded_marks=18.0,
        percentage=90.0,
        passed=True,
        status="finalized"
    )
    ev = AnswerEvaluation(
        id=500,
        submission_id=100,
        question_id=1,
        student_answer_text="Agile focuses on iterative sprints, continuous feedback, and working software.",
        ai_awarded_marks=18.0,
        final_marks=18.0,
        confidence_score=0.95,
        strengths='["Iterative delivery", "Continuous feedback"]',
        missed_concepts='[]',
        lost_marks_reason="Deducted 2 marks for missing Scrum ceremonies breakdown.",
        improvement_suggestions="Discuss sprint planning, retrospectives, and daily standups."
    )
    ev.question = q
    sub.evaluations = [ev]
    exam.submissions = [sub]

    # Test Excel Export
    excel_data = generate_excel_marksheet(exam)
    assert len(excel_data) > 1000
    assert excel_data.startswith(b'PK')  # Standard ZIP/OpenXML signature

    # Test PDF Export
    pdf_data = generate_student_pdf_report(sub, exam)
    assert len(pdf_data) > 1000
    assert pdf_data.startswith(b'%PDF')  # PDF magic bytes

def test_scanned_question_paper_parser():
    import os
    from app.services.document_parser import parse_uploaded_document
    qp_path = os.path.join("uploads", "exam_docs", "qp_5_ml IA2 question paper .pdf")
    if os.path.exists(qp_path):
        with open(qp_path, "rb") as f:
            file_bytes = f.read()
        doc_res = parse_uploaded_document(file_bytes, "ml_IA2_question_paper.pdf")
        assert len(doc_res["text"]) > 500
        questions = parse_question_paper_text(doc_res["text"])
        # Must extract full set of questions (10+ questions), not just 2!
        assert len(questions) >= 10, f"Expected >= 10 questions, got {len(questions)}"
        q_nums = [q.question_number for q in questions]
        assert any("1a" in q for q in q_nums)
        assert any("1b" in q for q in q_nums)
        assert any("2a" in q for q in q_nums)

def test_web_search_answers_calibrated_by_marks():
    """Tests that Web Search synthesizes mark-calibrated reference answers and proportional rubrics."""
    test_questions = [
        {"question_number": "1a", "question_text": "Explain Deadlock in operating systems and the four Coffman conditions.", "max_marks": 6.0},
        {"question_number": "1b", "question_text": "What is Virtual Memory and Paging in OS?", "max_marks": 4.0}
    ]
    answers = web_validator.generate_web_reference_answers_for_exam(test_questions, exam_subject="Operating Systems")
    assert len(answers) == 2
    for ans in answers:
        assert ans["question_number"] in ["1a", "1b"]
        assert len(ans["model_answer"]) > 100
        assert len(ans["rubric_items"]) >= 2
        # Verify rubric weights sum up to the allocated marks
        total_w = sum(float(r["weight_marks"]) for r in ans["rubric_items"])
        assert abs(total_w - ans["max_marks"]) < 0.1, f"Rubric sum {total_w} != max marks {ans['max_marks']}"
        # Citations must be retrieved
        assert len(ans["citations"]) > 0
        assert any(c["domain"] for c in ans["citations"])

def test_module_or_choice_evaluation():
    """
    Tests the University Module Choice rule:
    From each module (e.g. Module 1: Q1 [1a, 1b, 1c] OR Q2 [2a, 2b, 2c]),
    only ONE option's marks are considered toward final total.
    If student writes both, only the best-scoring option is awarded.
    """
    from app.services.module_evaluator import infer_module_and_choice, evaluate_submission_modules, calculate_exam_max_marks

    # 1. Test inference
    mod1_q1a, main1a, grp1 = infer_module_and_choice("1a")
    mod1_q2b, main2b, grp2 = infer_module_and_choice("2b")
    assert mod1_q1a == "Module 1"
    assert main1a == "Q1"
    assert mod1_q2b == "Module 1"
    assert main2b == "Q2"
    assert grp1 == "Module 1 (Q1 or Q2)"
    assert grp2 == "Module 1 (Q1 or Q2)"

    mod2_q3a, main3a, grp3 = infer_module_and_choice("3a")
    mod2_q4a, main4a, grp4 = infer_module_and_choice("4a")
    assert mod2_q3a == "Module 2"
    assert main3a == "Q3"
    assert mod2_q4a == "Module 2"
    assert main4a == "Q4"

    # 2. Test evaluation: Module 1 with both Q1 (1a, 1b) and Q2 (2a, 2b) attempted
    questions = [
        Question(id=101, question_number="1a", max_marks=8.0),
        Question(id=102, question_number="1b", max_marks=12.0),
        Question(id=103, question_number="2a", max_marks=8.0),
        Question(id=104, question_number="2b", max_marks=12.0),
        Question(id=105, question_number="3a", max_marks=10.0),
        Question(id=106, question_number="4a", max_marks=10.0),
    ]

    # Student scores:
    # Q1: 1a=7, 1b=10 -> Total Q1 = 17
    # Q2: 2a=8, 2b=12 -> Total Q2 = 20 (Better option!)
    # Q3: 3a=9        -> Total Q3 = 9
    # Q4: 4a=0        -> Not attempted
    marks_by_qid = {
        101: 7.0,
        102: 10.0,
        103: 8.0,
        104: 12.0,
        105: 9.0,
        106: 0.0,
    }

    res = evaluate_submission_modules(
        questions=questions,
        marks_by_qid=marks_by_qid,
        exam_total_marks=30.0,
        grace_marks=0.0
    )

    # In Module 1: Q1 was 17, Q2 was 20. ONLY Q2 (20 marks) must be considered!
    # If both were added, it would be 37 marks.
    m1_info = res["module_breakdown"]["Module 1"]
    assert m1_info["selected_option"] == "Q2"
    assert m1_info["awarded_marks"] == 20.0
    assert m1_info["options"]["Q1"]["awarded"] == 17.0
    assert m1_info["options"]["Q2"]["awarded"] == 20.0

    # In Module 2: Q3 was 9, Q4 was 0. ONLY Q3 (9 marks) must be considered!
    m2_info = res["module_breakdown"]["Module 2"]
    assert m2_info["selected_option"] == "Q3"
    assert m2_info["awarded_marks"] == 9.0

    # Overall awarded must be 20 (from Mod 1) + 9 (from Mod 2) = 29.0
    assert res["total_awarded_marks"] == 29.0



