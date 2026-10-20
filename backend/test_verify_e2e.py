import urllib.request
import json

print("=== 1. TESTING STUDENT PORTAL LOOKUP API ===")
test_usns = ['1HK23CS078', '1hk23cs078', '1HK23CS107', '1hk23cs107', '1HK23CS094', '1hk23cs094']

for usn in test_usns:
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/portal/lookup-result',
        data=json.dumps({'exam_code': 'BCS702', 'student_roll': usn}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  [PASS] USN '{usn}' -> Name: {data.get('student_name')}, USN: {data.get('student_roll')}, Total Score: {data.get('total_score')}")
    except Exception as e:
        print(f"  [FAIL] USN '{usn}' -> {e}")

print("\n=== 2. TESTING REVIEW MATRIX DATA ===")
try:
    req_ex = urllib.request.Request('http://127.0.0.1:8000/api/exams')
    with urllib.request.urlopen(req_ex) as resp:
        exs = json.loads(resp.read().decode('utf-8'))
        first_exam_id = exs[0]['id'] if exs else 2
    req_mat = urllib.request.Request(f'http://127.0.0.1:8000/api/exams/{first_exam_id}/review-matrix')
    with urllib.request.urlopen(req_mat) as resp:
        mat = json.loads(resp.read().decode('utf-8'))
        for s in mat.get('students', []):
            print(f"  USN: {s.get('student_roll')} | Name: {s.get('student_name')} | Email: {s.get('student_email')} | Awarded: {s.get('total_marks')}/{mat.get('total_exam_marks')}M | Result: {s.get('status')}")
except Exception as e:
    print(f"  [FAIL] Review Matrix -> {e}")

print("\n=== 3. TESTING EXAMS LIST API ===")
try:
    req_ex = urllib.request.Request('http://127.0.0.1:8000/api/exams')
    with urllib.request.urlopen(req_ex) as resp:
        exs = json.loads(resp.read().decode('utf-8'))
        for ex in exs:
            print(f"  Exam: {ex.get('title')} ({ex.get('exam_code')}) | Questions: {ex.get('total_questions')} | Submissions: {ex.get('total_submissions')}")
except Exception as e:
    print(f"  [FAIL] Exams API -> {e}")
