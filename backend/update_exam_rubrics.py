from app.database import SessionLocal
from app.models.exam import Exam
from app.models.question import Question, RubricItem
from app.services.rubric_extractor import extract_rubric_from_marking_scheme
from app.routers.grading import run_exam_grading

def main():
    db = SessionLocal()
    exam = db.query(Exam).filter(Exam.id == 1).first()
    if not exam:
        print("Exam 1 not found!")
        return

    # Delete old garbage rubrics for exam 1
    existing_rubrics = db.query(RubricItem).filter(RubricItem.question.has(exam_id=exam.id)).all()
    print(f"Deleting {len(existing_rubrics)} old rubrics...")
    for r in existing_rubrics:
        db.delete(r)
    db.commit()

    questions = db.query(Question).filter(Question.exam_id == exam.id).order_by(Question.order_idx).all()
    print(f"Populating rubrics for {len(questions)} questions...")

    scheme_text = exam.notes_extracted_text or exam.marking_scheme_text or ""

    total_rubrics_created = 0
    for q in questions:
        rubrics = extract_rubric_from_marking_scheme(scheme_text, q.question_number, q.max_marks)
        for idx, r_item in enumerate(rubrics):
            r = RubricItem(
                question_id=q.id,
                concept_title=r_item.concept_title,
                description=r_item.description,
                weight_marks=r_item.weight_marks,
                keywords=r_item.keywords,
                expected_points=r_item.expected_points,
                order_idx=idx
            )
            db.add(r)
            total_rubrics_created += 1
        print(f"  Q {q.question_number} ({q.max_marks}M): added {len(rubrics)} rubrics -> {[rb.concept_title for rb in rubrics]}")

    db.commit()
    print(f"\n[OK] Successfully populated {total_rubrics_created} rubric items!")

    # Re-run grading with real rubrics
    print("\nRe-evaluating submissions with updated rubrics...")
    grading_res = run_exam_grading(1, None, db)
    for res in grading_res['results']:
        print(f"  {res['student_name']}: {res['score']}/50M ({res['percentage']}%) - {'PASS' if res['passed'] else 'FAIL'}")

    db.close()

if __name__ == '__main__':
    main()
