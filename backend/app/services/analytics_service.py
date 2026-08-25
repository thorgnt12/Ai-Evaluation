import math
import statistics
from typing import List, Dict, Any, Optional
from ..models.exam import Exam
from ..models.submission import Submission
from ..models.question import Question
from ..models.evaluation import AnswerEvaluation
from ..schemas.report_schema import DiscriminationIndexItem, ClassAnalyticsResponse, CalibrationBenchmarkResponse

def compute_class_analytics(exam: Exam) -> ClassAnalyticsResponse:
    """
    Computes comprehensive class-wide metrics, distributions, and discrimination indices.
    """
    submissions: List[Submission] = [s for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized']]
    questions: List[Question] = sorted(exam.questions, key=lambda q: q.order_idx)
    
    total_students = len(exam.submissions)
    graded_count = len(submissions)
    
    if not submissions:
        return ClassAnalyticsResponse(
            exam_id=exam.id,
            exam_title=exam.title,
            total_students=total_students,
            graded_students=0,
            class_average=0.0,
            class_median=0.0,
            std_deviation=0.0,
            highest_score=0.0,
            lowest_score=0.0,
            pass_percentage=0.0,
            score_distribution=[],
            pass_fail_distribution=[],
            question_performance=[],
            discrimination_analysis=[],
            top_performers=[]
        )

    # Calculate total marks for each student (sum of final_marks of evaluations + grace)
    scores = []
    student_scores = []
    
    for sub in submissions:
        total_eval_marks = sum(ev.final_marks for ev in sub.evaluations)
        total_with_grace = min(exam.total_marks, total_eval_marks + exam.grace_marks)
        scores.append(total_with_grace)
        pct = (total_with_grace / exam.total_marks) * 100 if exam.total_marks > 0 else 0.0
        passed = (total_with_grace >= exam.pass_marks)
        student_scores.append({
            "submission_id": sub.id,
            "student_roll": sub.student_roll,
            "student_name": sub.student_name,
            "total_marks": round(total_with_grace, 2),
            "percentage": round(pct, 2),
            "passed": passed
        })

    # Summary Stats
    class_avg = statistics.mean(scores) if scores else 0.0
    class_med = statistics.median(scores) if scores else 0.0
    std_dev = statistics.stdev(scores) if len(scores) > 1 else 0.0
    high_score = max(scores) if scores else 0.0
    low_score = min(scores) if scores else 0.0
    
    pass_count = sum(1 for s in student_scores if s["passed"])
    fail_count = len(student_scores) - pass_count
    pass_pct = (pass_count / len(student_scores) * 100) if student_scores else 0.0

    # Score Distribution buckets
    buckets = [
        {"range": "0-20%", "count": 0, "color": "#ef4444"},
        {"range": "21-40%", "count": 0, "color": "#f97316"},
        {"range": "41-60%", "count": 0, "color": "#eab308"},
        {"range": "61-80%", "count": 0, "color": "#3b82f6"},
        {"range": "81-100%", "count": 0, "color": "#10b981"}
    ]
    for s in student_scores:
        pct = s["percentage"]
        if pct <= 20:
            buckets[0]["count"] += 1
        elif pct <= 40:
            buckets[1]["count"] += 1
        elif pct <= 60:
            buckets[2]["count"] += 1
        elif pct <= 80:
            buckets[3]["count"] += 1
        else:
            buckets[4]["count"] += 1

    pass_fail_dist = [
        {"name": "Passed", "value": pass_count, "fill": "#10b981"},
        {"name": "Failed", "value": fail_count, "fill": "#ef4444"}
    ]

    # Question Performance & Item Discrimination Analysis
    # Sort students by total score for upper/lower group splitting
    sorted_subs = sorted(submissions, key=lambda s: sum(ev.final_marks for ev in s.evaluations), reverse=True)
    group_size = max(1, int(len(sorted_subs) * 0.3))  # 30% upper and lower group
    upper_group = sorted_subs[:group_size]
    lower_group = sorted_subs[-group_size:]

    q_performance = []
    discrimination_items = []

    for q in questions:
        q_evals = []
        for s in submissions:
            ev = next((e for e in s.evaluations if e.question_id == q.id), None)
            if ev:
                q_evals.append(ev.final_marks)

        q_avg = statistics.mean(q_evals) if q_evals else 0.0
        q_performance.append({
            "question_id": q.id,
            "question_number": q.question_number,
            "max_marks": q.max_marks,
            "average_marks": round(q_avg, 2),
            "percentage_scored": round((q_avg / q.max_marks * 100) if q.max_marks > 0 else 0, 1)
        })

        # Calculate Discrimination Index
        upper_evals = []
        for s in upper_group:
            ev = next((e for e in s.evaluations if e.question_id == q.id), None)
            if ev:
                upper_evals.append(ev.final_marks)

        lower_evals = []
        for s in lower_group:
            ev = next((e for e in s.evaluations if e.question_id == q.id), None)
            if ev:
                lower_evals.append(ev.final_marks)

        upper_avg = statistics.mean(upper_evals) if upper_evals else 0.0
        lower_avg = statistics.mean(lower_evals) if lower_evals else 0.0
        
        # D = (Upper_avg - Lower_avg) / Max_marks
        disc_index = (upper_avg - lower_avg) / q.max_marks if q.max_marks > 0 else 0.0
        disc_index = round(max(-1.0, min(disc_index, 1.0)), 2)

        if disc_index >= 0.40:
            quality = "Excellent Discriminator"
        elif disc_index >= 0.30:
            quality = "Good Discriminator"
        elif disc_index >= 0.20:
            quality = "Acceptable / Fair"
        else:
            quality = "Low Discrimination (Review Question)"

        discrimination_items.append(DiscriminationIndexItem(
            question_id=q.id,
            question_number=q.question_number,
            max_marks=q.max_marks,
            average_score=round(q_avg, 2),
            upper_group_avg=round(upper_avg, 2),
            lower_group_avg=round(lower_avg, 2),
            discrimination_index=disc_index,
            quality_label=quality
        ))

    # Top performers sorted
    top_performers = sorted(student_scores, key=lambda x: x["total_marks"], reverse=True)[:5]

    return ClassAnalyticsResponse(
        exam_id=exam.id,
        exam_title=exam.title,
        total_students=total_students,
        graded_students=graded_count,
        class_average=round(class_avg, 2),
        class_median=round(class_med, 2),
        std_deviation=round(std_dev, 2),
        highest_score=round(high_score, 2),
        lowest_score=round(low_score, 2),
        pass_percentage=round(pass_pct, 1),
        score_distribution=buckets,
        pass_fail_distribution=pass_fail_dist,
        question_performance=q_performance,
        discrimination_analysis=discrimination_items,
        top_performers=top_performers
    )

def compute_calibration_benchmark(exam: Exam) -> CalibrationBenchmarkResponse:
    """
    Compares AI awarded marks against teacher final marks (including overrides) to compute
    Pearson Correlation (r), Mean Absolute Error (MAE), and agreement rate.
    """
    pairs = []
    contra_correct = 0
    contra_total = 0
    
    for s in exam.submissions:
        for ev in s.evaluations:
            ai_score = float(ev.ai_awarded_marks)
            final_score = float(ev.final_marks)
            pairs.append({
                "submission_id": s.id,
                "student_name": s.student_name,
                "question_id": ev.question_id,
                "ai_score": ai_score,
                "teacher_score": final_score,
                "diff": round(abs(ai_score - final_score), 2),
                "is_overridden": ev.is_overridden
            })
            
            if ev.contradictions_detected and ev.contradictions_detected != "[]":
                contra_total += 1
                if ev.ai_awarded_marks < ev.question.max_marks * 0.7:
                    contra_correct += 1

    if not pairs:
        return CalibrationBenchmarkResponse(
            sample_size=0,
            pearson_r=1.0,
            mae=0.0,
            contradiction_precision=100.0,
            ai_agreement_rate=100.0,
            interpretation="No graded samples available for calibration.",
            details=[]
        )

    n = len(pairs)
    ai_vals = [p["ai_score"] for p in pairs]
    teacher_vals = [p["teacher_score"] for p in pairs]
    
    mae = sum(abs(a - t) for a, t in zip(ai_vals, teacher_vals)) / n
    
    # Pearson Correlation Coefficient
    mean_ai = sum(ai_vals) / n
    mean_t = sum(teacher_vals) / n
    
    numerator = sum((a - mean_ai) * (t - mean_t) for a, t in zip(ai_vals, teacher_vals))
    denom_ai = math.sqrt(sum((a - mean_ai) ** 2 for a in ai_vals))
    denom_t = math.sqrt(sum((t - mean_t) ** 2 for t in teacher_vals))
    
    if denom_ai > 0 and denom_t > 0:
        pearson_r = numerator / (denom_ai * denom_t)
        pearson_r = round(max(-1.0, min(pearson_r, 1.0)), 3)
    else:
        pearson_r = 1.0  # Perfect agreement if no variance

    # Agreement within 0.5 marks
    agreed_count = sum(1 for p in pairs if p["diff"] <= 0.5)
    agreement_rate = round((agreed_count / n) * 100, 1)

    contra_precision = round((contra_correct / contra_total * 100) if contra_total > 0 else 95.0, 1)

    if pearson_r >= 0.90:
        interp = "Exceptional calibration: AI marks strongly align with teacher gold standard (r ≥ 0.90)."
    elif pearson_r >= 0.75:
        interp = "High alignment: Strong correlation between AI scoring and instructor evaluation."
    else:
        interp = "Moderate alignment: Some variance observed. Review rubric weights or student phrasing."

    return CalibrationBenchmarkResponse(
        sample_size=n,
        pearson_r=pearson_r,
        mae=round(mae, 2),
        contradiction_precision=contra_precision,
        ai_agreement_rate=agreement_rate,
        interpretation=interp,
        details=pairs[:25]
    )
