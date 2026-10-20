import requests

BASE = "http://127.0.0.1:8000/api"

def test_evaluator_isolation():
    print("Testing evaluator task isolation...")

    # 1. Login Admin
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@smartgrade.edu", "password": "admin123"})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Verify exams list for admin
    r = requests.get(f"{BASE}/exams", headers=admin_headers)
    assert r.status_code == 200
    exams = r.json()
    assert len(exams) >= 1, "Expected at least 1 exam"
    exam_id = exams[0]["id"]
    print(f"[PASS] Admin sees {len(exams)} exams (Exam ID: {exam_id})")

    # 2. Get Priyanshu's user ID
    r = requests.get(f"{BASE}/exams/teachers/list", headers=admin_headers)
    assert r.status_code == 200
    teachers = r.json()
    priyanshu = next((t for t in teachers if "priyanshu" in t["full_name"].lower() or "priyanshu" in t["email"].lower()), None)
    assert priyanshu is not None, "Priyanshu user not found in teachers list"
    priyanshu_id = priyanshu["id"]
    print(f"[PASS] Found Priyanshu in faculty list: ID {priyanshu_id} ({priyanshu['email']})")

    # 3. Assign exam to Priyanshu
    r = requests.put(f"{BASE}/exams/{exam_id}/assign-teacher", json={"teacher_id": priyanshu_id}, headers=admin_headers)
    assert r.status_code == 200, f"Assignment failed: {r.text}"
    print(f"[PASS] Admin assigned Exam {exam_id} to Priyanshu (ID: {priyanshu_id})")

    # 4. Login as Other Teacher (Prof. Eleanor Vance)
    r = requests.post(f"{BASE}/auth/login", json={"email": "teacher@smartgrade.edu", "password": "teacher123"})
    assert r.status_code == 200, f"Eleanor login failed: {r.text}"
    eleanor_token = r.json()["access_token"]
    eleanor_headers = {"Authorization": f"Bearer {eleanor_token}"}

    # Verify Eleanor sees 0 exams
    r = requests.get(f"{BASE}/exams", headers=eleanor_headers)
    assert r.status_code == 200
    eleanor_exams = r.json()
    assert len(eleanor_exams) == 0, f"Eleanor should see 0 exams, but got: {len(eleanor_exams)}"
    print("[PASS] Other Teacher (Eleanor Vance) sees 0 exams (task is hidden)")

    # Verify Eleanor gets 403 on direct access
    r = requests.get(f"{BASE}/exams/{exam_id}", headers=eleanor_headers)
    assert r.status_code == 403, f"Expected 403 for Eleanor on get_exam, got: {r.status_code}"
    print("[PASS] Other Teacher direct GET /exams/1 blocked with 403 Forbidden")

    r = requests.get(f"{BASE}/exams/{exam_id}/review-matrix", headers=eleanor_headers)
    assert r.status_code == 403, f"Expected 403 on review-matrix, got: {r.status_code}"
    print("[PASS] Other Teacher GET /review-matrix blocked with 403 Forbidden")

    r = requests.post(f"{BASE}/exams/{exam_id}/run-grading", headers=eleanor_headers)
    assert r.status_code == 403, f"Expected 403 on run-grading, got: {r.status_code}"
    print("[PASS] Other Teacher POST /run-grading blocked with 403 Forbidden")

    r = requests.get(f"{BASE}/exams/{exam_id}/submissions", headers=eleanor_headers)
    assert r.status_code == 403, f"Expected 403 on submissions, got: {r.status_code}"
    print("[PASS] Other Teacher GET /submissions blocked with 403 Forbidden")

    # 5. Login as Priyanshu Singh
    r = requests.post(f"{BASE}/auth/login", json={"email": "priyanshublr537@gmail.com", "password": "teacher123"})
    assert r.status_code == 200, f"Priyanshu login failed: {r.text}"
    priyanshu_token = r.json()["access_token"]
    priyanshu_headers = {"Authorization": f"Bearer {priyanshu_token}"}

    # Verify Priyanshu sees exactly the assigned exam
    r = requests.get(f"{BASE}/exams", headers=priyanshu_headers)
    assert r.status_code == 200
    priyanshu_exams = r.json()
    assert len(priyanshu_exams) == 1, f"Priyanshu should see 1 exam, got: {len(priyanshu_exams)}"
    assert priyanshu_exams[0]["id"] == exam_id, f"Exam ID mismatch: {priyanshu_exams[0]['id']} vs {exam_id}"
    print(f"[PASS] Assigned Evaluator (Priyanshu) sees exactly the assigned exam: '{priyanshu_exams[0]['title']}'")

    # Verify Priyanshu can access details and submissions
    r = requests.get(f"{BASE}/exams/{exam_id}", headers=priyanshu_headers)
    assert r.status_code == 200, f"Priyanshu should access exam details: {r.status_code}"
    print("[PASS] Assigned Evaluator can access exam details (200 OK)")

    r = requests.get(f"{BASE}/exams/{exam_id}/submissions", headers=priyanshu_headers)
    assert r.status_code == 200, f"Priyanshu should access submissions: {r.status_code}"
    print(f"[PASS] Assigned Evaluator can access submissions (200 OK, {len(r.json())} submissions)")

    print("\n===> ALL EVALUATOR ISOLATION CHECKS PASSED 100%! <===")

if __name__ == "__main__":
    test_evaluator_isolation()
