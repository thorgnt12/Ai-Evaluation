import sqlite3

conn = sqlite3.connect('smartgrade.db')
c = conn.cursor()

# Update submissions to ensure USN@hkbk.edu.in
subs = c.execute("SELECT id, student_roll FROM submissions").fetchall()
for sid, roll in subs:
    if roll:
        email = f"{roll.strip().lower()}@hkbk.edu.in"
        c.execute("UPDATE submissions SET student_email = ? WHERE id = ?", (email, sid))
conn.commit()

# 2. Update Exam 1 (BCS702) marking scheme path and text
c.execute("""
    UPDATE exams
    SET marking_scheme_path = 'uploads/exam_docs/BCS702_marking_scheme.txt',
        marking_scheme_text = notes_extracted_text
    WHERE id = 1
""")

conn.commit()

# Print results
print('Updated Submissions:')
for s in c.execute('SELECT id, exam_id, student_roll, student_name, student_email FROM submissions').fetchall():
    print(' ', s)

print('Updated Exam 1:')
e = c.execute('SELECT id, exam_code, marking_scheme_path, length(marking_scheme_text), length(notes_extracted_text) FROM exams WHERE id=1').fetchone()
print(' ', e)
conn.close()
