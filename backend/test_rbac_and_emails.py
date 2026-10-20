import requests

BASE = 'http://127.0.0.1:8000/api'

def run_tests():
    # 1. Test Admin Login
    r_admin = requests.post(f'{BASE}/auth/login', json={'email': 'admin@smartgrade.edu', 'password': 'admin123'})
    assert r_admin.status_code == 200
    admin_token = r_admin.json()['access_token']
    admin_headers = {'Authorization': f'Bearer {admin_token}'}
    
    admin_exams = requests.get(f'{BASE}/exams', headers=admin_headers).json()
    print(f'[PASS] Admin sees all exams: {len(admin_exams)} exams found')
    assert len(admin_exams) >= 1
    exam = admin_exams[0]
    exam_id = exam['id']

    # 2. Get Priyanshu (Evaluator)
    t_list = requests.get(f'{BASE}/exams/teachers/list', headers=admin_headers).json()
    priyanshu = next((t for t in t_list if 'priyanshu' in t['full_name'].lower() or 'priyanshu' in t['email'].lower()), None)
    assert priyanshu is not None
    priyanshu_id = priyanshu['id']

    # 3. Assign exam to Priyanshu
    assign_r = requests.put(f'{BASE}/exams/{exam_id}/assign-teacher', json={'teacher_id': priyanshu_id}, headers=admin_headers)
    assert assign_r.status_code == 200
    print(f'[PASS] Admin delegated Exam {exam_id} to Evaluator Priyanshu (ID: {priyanshu_id})')

    # 4. Login as Other Teacher (Prof. Eleanor Vance) - should see 0 exams
    r_t1 = requests.post(f'{BASE}/auth/login', json={'email': 'teacher@smartgrade.edu', 'password': 'teacher123'})
    assert r_t1.status_code == 200
    t1_token = r_t1.json()['access_token']
    t1_headers = {'Authorization': f'Bearer {t1_token}'}
    t1_exams = requests.get(f'{BASE}/exams', headers=t1_headers).json()
    print(f'[PASS] Other Teacher (Eleanor Vance) sees: {len(t1_exams)} exams (expected 0)')
    assert len(t1_exams) == 0

    # Eleanor direct access blocked
    r_forbid = requests.get(f'{BASE}/exams/{exam_id}', headers=t1_headers)
    assert r_forbid.status_code == 403
    print(f'[PASS] Other Teacher direct access blocked: {r_forbid.status_code} (expected 403)')

    # 5. Login as Priyanshu (Evaluator) - should see the 1 assigned exam
    r_pri = requests.post(f'{BASE}/auth/login', json={'email': 'priyanshublr537@gmail.com', 'password': 'teacher123'})
    assert r_pri.status_code == 200
    pri_token = r_pri.json()['access_token']
    pri_headers = {'Authorization': f'Bearer {pri_token}'}
    pri_exams = requests.get(f'{BASE}/exams', headers=pri_headers).json()
    print(f'[PASS] Assigned Evaluator (Priyanshu) sees: {len(pri_exams)} exams (expected 1)')
    assert len(pri_exams) == 1
    assert pri_exams[0]['id'] == exam_id

    pri_detail = requests.get(f'{BASE}/exams/{exam_id}', headers=pri_headers)
    assert pri_detail.status_code == 200
    print('[PASS] Assigned Evaluator access granted to exam details')

    # 6. Verify student email domain @hkbk.edu.in
    subs = requests.get(f'{BASE}/exams/{exam_id}/submissions', headers=admin_headers).json()
    for s in subs:
        mail = s['student_email']
        roll = s['student_roll']
        assert mail.endswith('@hkbk.edu.in'), f'Invalid email domain: {mail}'
        print(f'[PASS] Student verified: {roll} -> {mail}')

    # 7. Verify public student portal lookup with @hkbk.edu.in
    portal_r = requests.post(
        f'{BASE}/portal/lookup-result',
        json={'exam_code': exam['exam_code'], 'student_roll': '1HK23CS078'}
    )
    if portal_r.status_code == 200:
        pdata = portal_r.json()
        assert pdata['student_email'] == '1hk23cs078@hkbk.edu.in', f"Email mismatch: {pdata['student_email']}"
        print(f"[PASS] Student portal lookup successful: {pdata['student_roll']} -> {pdata['student_email']}")

    print('\n===> ALL SYSTEM VERIFICATION CHECKS COMPLETED SUCCESSFULLY! <===')

if __name__ == '__main__':
    run_tests()
