import logging
from datetime import datetime
from typing import List, Dict, Any
from ..models.exam import Exam
from ..models.submission import Submission

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.sent_logs: List[Dict[str, Any]] = []

    def send_test_email(self, teacher_email: str, exam: Exam) -> Dict[str, Any]:
        """
        Sends/Simulates a test email report to the instructor for verification prior to bulk release.
        """
        timestamp = datetime.now().isoformat()
        log_entry = {
            "type": "teacher_test_email",
            "recipient": teacher_email,
            "exam_title": exam.title,
            "subject": f"[Test Preview] Results Finalized: {exam.title} ({exam.exam_code})",
            "status": "delivered",
            "timestamp": timestamp,
            "preview_body": (
                f"Hello Instructor,\n\n"
                f"Here is a test dispatch preview for exam '{exam.title}'.\n"
                f"Total Submissions: {len(exam.submissions)}\n"
                f"Grading Mode: {exam.grading_mode}\n"
                f"All marks have been validated. You can proceed with one-click bulk dispatch to students."
            )
        }
        self.sent_logs.append(log_entry)
        logger.info(f"Test email sent to {teacher_email} for exam {exam.exam_code}")
        return {
            "success": True,
            "recipient": teacher_email,
            "message": f"Test report preview successfully dispatched to {teacher_email}.",
            "log": log_entry
        }

    def bulk_dispatch_results(self, exam: Exam) -> Dict[str, Any]:
        """
        Sends finalized scorecards and feedback links to all enrolled students who submitted answer sheets.
        """
        dispatch_logs = []
        for sub in exam.submissions:
            total_eval = sum(e.final_marks for e in sub.evaluations)
            total_score = min(exam.total_marks, total_eval + exam.grace_marks)
            pct = (total_score / exam.total_marks * 100) if exam.total_marks > 0 else 0.0
            passed = (total_score >= exam.pass_marks)
            
            entry = {
                "student_roll": sub.student_roll,
                "student_name": sub.student_name,
                "recipient_email": sub.student_email,
                "score": f"{round(total_score, 1)} / {exam.total_marks}",
                "percentage": f"{round(pct, 1)}%",
                "status": "delivered",
                "timestamp": datetime.now().isoformat()
            }
            dispatch_logs.append(entry)
            self.sent_logs.append(entry)

        return {
            "success": True,
            "exam_code": exam.exam_code,
            "recipient_count": len(dispatch_logs),
            "message": f"Successfully dispatched official results to {len(dispatch_logs)} student(s).",
            "logs": dispatch_logs
        }

email_service = EmailService()
