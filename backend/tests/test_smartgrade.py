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
