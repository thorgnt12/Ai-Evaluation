import os
from app.database import SessionLocal
from app.models.submission import Submission
from app.models.exam import Exam
from app.services.gemini_vision_parser import extract_student_answers_with_vision
from app.services.student_answer_parser import parse_student_answer_script
from app.routers.grading import run_exam_grading

def main():
    db = SessionLocal()
    exam = db.query(Exam).filter(Exam.id == 1).first()
    subs = db.query(Submission).filter(Submission.exam_id == 1).all()

    for s in subs:
        file_bytes = b''
        if s.file_path and os.path.exists(s.file_path):
            with open(s.file_path, 'rb') as f:
                file_bytes = f.read()
        vres = extract_student_answers_with_vision(file_bytes, s.original_filename)
        parsed = parse_student_answer_script(vres['text'], exam.questions, s.original_filename)
        if parsed.get('structured_full_text'):
            s.extracted_text = parsed['structured_full_text']
        else:
            s.extracted_text = vres['text']
        s.ocr_confidence = vres.get('confidence', 98.0)
        s.is_ocr_verified = True
        s.status = 'ready_for_grading'
        att = parsed.get('attempted_questions', [])
        print(f"Updated {s.student_name}: attempted {len(att)}: {att}, text_len={len(s.extracted_text)}")

    db.commit()

    print("\nRunning AI Exam Grading Engine...")
    grading_res = run_exam_grading(1, None, db)
    print("Grading completed successfully!")
    for r in grading_res['results']:
        name = r['student_name']
        score = r['score']
        pct = r['percentage']
        passed = r['passed']
        print(f"-> {name}: Total={score}/50M ({pct}%) - {'PASS' if passed else 'FAIL'}")
        for mod, info in r['module_breakdown'].items():
            print(f"     {mod}: selected {info['selected_option']} -> {info['awarded_marks']}/{info['module_max_marks']}M")

    db.close()

if __name__ == '__main__':
    main()
