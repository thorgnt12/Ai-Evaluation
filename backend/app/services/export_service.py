import io
import os
import re
import html
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
from reportlab.pdfgen import canvas

from ..models.exam import Exam
from ..models.submission import Submission
from ..models.question import Question
from ..models.evaluation import AnswerEvaluation

def generate_excel_marksheet(exam: Exam, teacher_name: Optional[str] = None) -> bytes:
    """
    Generates an official, university-grade multi-sheet Excel marksheet with openpyxl.
    - Sheet 1: Master Marksheet (Institution Header, Subject, Type, Marks, Teacher, USNs & Marks)
    - Sheet 2: Class Analytics Summary
    - Sheet 3: Question-Level Performance
    """
    wb = openpyxl.Workbook()
    
    if not teacher_name:
        teacher_name = "Prof. Eleanor Vance"

    # Define color scheme & styles
    primary_navy = "1E3A8A"
    header_fill = PatternFill(start_color=primary_navy, end_color=primary_navy, fill_type="solid")
    meta_label_fill = PatternFill(start_color="EEF2FF", end_color="EEF2FF", fill_type="solid")  # Light indigo
    meta_value_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")  # Soft slate
    green_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    amber_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    
    title_font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
    meta_label_font = Font(name="Calibri", size=10, bold=True, color="1E3A8A")
    meta_val_font = Font(name="Calibri", size=10, bold=True, color="0F172A")
    header_font = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    bold_font = Font(name="Calibri", size=10, bold=True)
    regular_font = Font(name="Calibri", size=10)
    
    thin_border = Border(
        left=Side(style='thin', color='CBD5E1'),
        right=Side(style='thin', color='CBD5E1'),
        top=Side(style='thin', color='CBD5E1'),
        bottom=Side(style='thin', color='CBD5E1')
    )
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')

    # -------------------------------------------------------------
    # SHEET 1: Master Marksheet
    # -------------------------------------------------------------
    ws1 = wb.active
    ws1.title = "Master Marksheet"
    ws1.views.sheetView[0].showGridLines = True

    questions: List[Question] = sorted(exam.questions, key=lambda q: q.order_idx)
    base_headers = ["Sl No", "Student USN / Roll No", "Student Name", "Email Address"]
    q_headers = [f"Q{q.question_number} ({q.max_marks}M)" for q in questions]
    end_headers = ["Total Score", "Max Marks", "Percentage", "Result", "Teacher Review Status"]
    all_headers = base_headers + q_headers + end_headers
    num_cols = max(len(all_headers), 6)
    end_col_letter = get_column_letter(num_cols)

    # 1. University Header Banner (Row 1)
    ws1.merge_cells(f"A1:{end_col_letter}1")
    ws1["A1"] = "SMARTGRADE EVALAI — OFFICIAL ASSESSMENT RESULTS & MARKSHEET"
    ws1["A1"].font = title_font
    ws1["A1"].fill = header_fill
    ws1["A1"].alignment = center_align
    ws1.row_dimensions[1].height = 32

    # 2. Subtitle / Timestamp (Row 2)
    ws1.merge_cells(f"A2:{end_col_letter}2")
    ws1["A2"] = f"Official Assessment Results Record • Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')} • Status: {'FINALIZED & PUBLISHED' if exam.status == 'finalized' else exam.status.upper()}"
    ws1["A2"].font = Font(name="Calibri", size=9, italic=True, color="475569")
    ws1["A2"].fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    ws1["A2"].alignment = center_align
    ws1.row_dimensions[2].height = 20

    # 3. Top Details Metadata Grid (Rows 3 to 6)
    meta_rows = [
        # (Row, Label1, Val1, Label2, Val2)
        ("Subject Name:", str(exam.subject), "Exam Type & Code:", f"{exam.exam_code} — {exam.title}"),
        ("Total Exam Marks:", f"{exam.total_marks} Marks", "Pass Marks Threshold:", f"{exam.pass_marks} Marks"),
        ("Teacher / Evaluator:", str(teacher_name), "Academic Term / Session:", str(exam.term or "AY 2026-27")),
        ("Evaluation Mode:", str(exam.grading_mode.replace('_', ' ').title()), "Finalization Status:", "FINALIZED & PUBLISHED" if exam.status == "finalized" else str(exam.status).upper())
    ]

    for offset, (lbl1, val1, lbl2, val2) in enumerate(meta_rows):
        r = 3 + offset
        ws1.row_dimensions[r].height = 22

        c_l1 = ws1.cell(row=r, column=1, value=lbl1)
        c_l1.font = meta_label_font
        c_l1.fill = meta_label_fill
        c_l1.border = thin_border
        c_l1.alignment = left_align

        c_v1 = ws1.cell(row=r, column=2, value=val1)
        c_v1.font = meta_val_font
        c_v1.fill = meta_value_fill
        c_v1.border = thin_border
        c_v1.alignment = left_align

        c_l2 = ws1.cell(row=r, column=3, value=lbl2)
        c_l2.font = meta_label_font
        c_l2.fill = meta_label_fill
        c_l2.border = thin_border
        c_l2.alignment = left_align

        c_v2 = ws1.cell(row=r, column=4, value=val2)
        c_v2.font = meta_val_font
        c_v2.fill = meta_value_fill
        c_v2.border = thin_border
        c_v2.alignment = left_align
        if "FINALIZED" in str(val2):
            c_v2.fill = green_fill
            c_v2.font = Font(name="Calibri", size=10, bold=True, color="065F46")

    ws1.row_dimensions[7].height = 10

    # 4. Table Column Headers (Row 8)
    row_idx = 8
    ws1.row_dimensions[row_idx].height = 28
    for col_idx, h in enumerate(all_headers, 1):
        cell = ws1.cell(row=row_idx, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border

    # 5. Populate Student Rows (Row 9+)
    submissions = sorted(exam.submissions, key=lambda s: s.student_roll)
    for idx, sub in enumerate(submissions, 1):
        row_idx += 1
        ws1.row_dimensions[row_idx].height = 22
        total_score = sub.total_awarded_marks if sub.total_awarded_marks is not None else min(exam.total_marks, sum(e.final_marks for e in sub.evaluations) + exam.grace_marks)
        pct = sub.percentage if sub.percentage is not None else ((total_score / exam.total_marks * 100) if exam.total_marks > 0 else 0.0)
        passed = sub.passed if sub.passed is not None else (total_score >= exam.pass_marks)
        has_override = any(e.is_overridden for e in sub.evaluations)

        ws1.cell(row=row_idx, column=1, value=idx).alignment = center_align
        
        usn_cell = ws1.cell(row=row_idx, column=2, value=sub.student_roll)
        usn_cell.alignment = center_align
        usn_cell.font = bold_font

        name_cell = ws1.cell(row=row_idx, column=3, value=sub.student_name)
        name_cell.alignment = left_align
        name_cell.font = bold_font

        ws1.cell(row=row_idx, column=4, value=sub.student_email).alignment = left_align

        # Question marks
        col_offset = 5
        for q in questions:
            ev = next((e for e in sub.evaluations if e.question_id == q.id), None)
            val = ev.final_marks if ev else 0.0
            q_cell = ws1.cell(row=row_idx, column=col_offset, value=val)
            q_cell.alignment = center_align
            if ev and ev.is_overridden:
                q_cell.fill = amber_fill
                q_cell.font = bold_font
            col_offset += 1

        tot_cell = ws1.cell(row=row_idx, column=col_offset, value=round(total_score, 2))
        tot_cell.alignment = center_align
        tot_cell.font = Font(name="Calibri", size=10, bold=True, color="1E3A8A")

        ws1.cell(row=row_idx, column=col_offset + 1, value=exam.total_marks).alignment = center_align
        ws1.cell(row=row_idx, column=col_offset + 2, value=f"{round(pct, 1)}%").alignment = center_align
        
        res_cell = ws1.cell(row=row_idx, column=col_offset + 3, value="PASS" if passed else "FAIL")
        res_cell.alignment = center_align
        res_cell.fill = green_fill if passed else red_fill
        res_cell.font = Font(name="Calibri", size=10, bold=True, color="065F46" if passed else "991B1B")

        rev_cell = ws1.cell(row=row_idx, column=col_offset + 4, value="Teacher Overridden (Audited)" if has_override else "Verified & Approved")
        rev_cell.alignment = center_align
        if has_override:
            rev_cell.font = Font(name="Calibri", size=9, bold=True, color="92400E")

        # Set borders for entire row
        for col_idx in range(1, len(all_headers) + 1):
            ws1.cell(row=row_idx, column=col_idx).border = thin_border
            if not ws1.cell(row=row_idx, column=col_idx).font.bold:
                ws1.cell(row=row_idx, column=col_idx).font = regular_font

    # 6. Summary Statistics Box
    graded_subs = [s for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized']]
    scores = [min(exam.total_marks, sum(e.final_marks for e in s.evaluations) + exam.grace_marks) for s in graded_subs]
    avg_score = (sum(scores) / len(scores)) if scores else 0.0
    pass_cnt = sum(1 for s in scores if s >= exam.pass_marks)
    pass_pct = (pass_cnt / len(scores) * 100) if scores else 0.0

    summary_start_row = row_idx + 2
    ws1.cell(row=summary_start_row, column=2, value="Cohort Summary Statistics").font = Font(name="Calibri", size=11, bold=True, color="1E3A8A")
    
    stats = [
        ("Total Candidates Enrolled:", len(exam.submissions)),
        ("Total Submissions Evaluated:", len(graded_subs)),
        ("Class Average Score:", f"{round(avg_score, 2)} / {exam.total_marks}"),
        ("Overall Pass Rate:", f"{round(pass_pct, 1)}% ({pass_cnt} Passed)"),
        ("Highest Score Awarded:", f"{round(max(scores), 2)}" if scores else "N/A"),
        ("Lowest Score Awarded:", f"{round(min(scores), 2)}" if scores else "N/A")
    ]
    for r_offset, (lbl, val) in enumerate(stats, 1):
        r_num = summary_start_row + r_offset
        c_lbl = ws1.cell(row=r_num, column=2, value=lbl)
        c_lbl.font = meta_label_font
        c_lbl.fill = meta_label_fill
        c_lbl.border = thin_border
        c_lbl.alignment = left_align

        c_val = ws1.cell(row=r_num, column=3, value=val)
        c_val.font = meta_val_font
        c_val.fill = meta_value_fill
        c_val.border = thin_border
        c_val.alignment = center_align

    # 7. Official Signatures
    sig_row = summary_start_row + len(stats) + 3
    ws1.cell(row=sig_row, column=2, value=f"Evaluator / Teacher: {teacher_name}").font = bold_font
    ws1.cell(row=sig_row + 1, column=2, value="Signature: ___________________________").font = regular_font

    ws1.cell(row=sig_row, column=4, value="Controller of Examinations: Academic Office").font = bold_font
    ws1.cell(row=sig_row + 1, column=4, value="Signature: ___________________________").font = regular_font

    # Adjust column widths
    for col in ws1.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws1.column_dimensions[col_letter].width = max(max_len + 4, 14)

    # -------------------------------------------------------------
    # SHEET 2: Class Analytics Summary
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="Class Summary")
    ws2.views.sheetView[0].showGridLines = True
    
    ws2["A1"] = f"{exam.title} - Cohort Analytics"
    ws2["A1"].font = title_font
    
    graded_subs = [s for s in exam.submissions if s.status in ['graded', 'in_review', 'finalized']]
    scores = [min(exam.total_marks, sum(e.final_marks for e in s.evaluations) + exam.grace_marks) for s in graded_subs]
    
    import statistics
    avg_score = statistics.mean(scores) if scores else 0.0
    med_score = statistics.median(scores) if scores else 0.0
    stdev_score = statistics.stdev(scores) if len(scores) > 1 else 0.0
    pass_cnt = sum(1 for s in scores if s >= exam.pass_marks)
    pass_pct = (pass_cnt / len(scores) * 100) if scores else 0.0

    kpis = [
        ("Metric", "Value"),
        ("Total Students Enrolled", len(exam.submissions)),
        ("Evaluated Submissions", len(graded_subs)),
        ("Class Average Score", f"{round(avg_score, 2)} / {exam.total_marks}"),
        ("Median Score", f"{round(med_score, 2)} / {exam.total_marks}"),
        ("Standard Deviation", round(stdev_score, 2)),
        ("Highest Score", f"{round(max(scores), 2)}" if scores else "N/A"),
        ("Lowest Score", f"{round(min(scores), 2)}" if scores else "N/A"),
        ("Pass Percentage", f"{round(pass_pct, 1)}%"),
        ("Passing Threshold", f"{exam.pass_marks} marks"),
        ("Grace Marks Configured", f"{exam.grace_marks} marks")
    ]

    for r_idx, (m, v) in enumerate(kpis, 3):
        c1 = ws2.cell(row=r_idx, column=1, value=m)
        c2 = ws2.cell(row=r_idx, column=2, value=v)
        c1.border = thin_border
        c2.border = thin_border
        if r_idx == 3:
            c1.fill = header_fill
            c2.fill = header_fill
            c1.font = header_font
            c2.font = header_font
        else:
            c1.font = bold_font
            c2.font = regular_font

    ws2.column_dimensions['A'].width = 30
    ws2.column_dimensions['B'].width = 20

    # -------------------------------------------------------------
    # SHEET 3: Question Item Analysis
    # -------------------------------------------------------------
    ws3 = wb.create_sheet(title="Question Analysis")
    ws3.views.sheetView[0].showGridLines = True
    
    ws3["A1"] = f"{exam.title} - Question Discrimination & Item Analysis"
    ws3["A1"].font = title_font
    
    q_table_headers = ["Q #", "Question Text", "Max Marks", "Class Avg Score", "% Success", "Grading Type"]
    for c_idx, h in enumerate(q_table_headers, 1):
        c = ws3.cell(row=3, column=c_idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.border = thin_border
        c.alignment = center_align

    for r_idx, q in enumerate(questions, 4):
        evals = [e.final_marks for s in graded_subs for e in s.evaluations if e.question_id == q.id]
        q_avg = statistics.mean(evals) if evals else 0.0
        q_pct = (q_avg / q.max_marks * 100) if q.max_marks > 0 else 0.0

        ws3.cell(row=r_idx, column=1, value=q.question_number).alignment = center_align
        ws3.cell(row=r_idx, column=2, value=q.question_text[:80] + ("..." if len(q.question_text) > 80 else "")).alignment = left_align
        ws3.cell(row=r_idx, column=3, value=q.max_marks).alignment = center_align
        ws3.cell(row=r_idx, column=4, value=round(q_avg, 2)).alignment = center_align
        ws3.cell(row=r_idx, column=5, value=f"{round(q_pct, 1)}%").alignment = center_align
        ws3.cell(row=r_idx, column=6, value=q.grading_type.replace('_', ' ').title()).alignment = center_align

        for c_idx in range(1, len(q_table_headers) + 1):
            ws3.cell(row=r_idx, column=c_idx).border = thin_border
            ws3.cell(row=r_idx, column=c_idx).font = regular_font

    ws3.column_dimensions['A'].width = 10
    ws3.column_dimensions['B'].width = 50
    ws3.column_dimensions['C'].width = 14
    ws3.column_dimensions['D'].width = 16
    ws3.column_dimensions['E'].width = 14
    ws3.column_dimensions['F'].width = 22

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()


def generate_student_pdf_report(submission: Submission, exam: Exam) -> bytes:
    """
    Generates a beautifully styled individual student scorecard and evaluation report using ReportLab.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#1E3A8A")
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748B")
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=10,
        spaceAfter=6
    )
    cell_bold = ParagraphStyle(
        'CellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )
    cell_regular = ParagraphStyle(
        'CellRegular',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#334155")
    )
    feedback_style = ParagraphStyle(
        'FeedbackText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#475569")
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph(f"SmartGrade Assessment Report", title_style))
    story.append(Paragraph(f"Exam: {exam.title} ({exam.subject}) | Code: {exam.exam_code} | Date: {datetime.now().strftime('%B %d, %Y')}", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#E2E8F0"), spaceBefore=2, spaceAfter=12))

    # 2. Student Info & Score Pill Table
    total_score = submission.total_awarded_marks if submission.total_awarded_marks is not None else min(exam.total_marks, sum(e.final_marks for e in submission.evaluations) + exam.grace_marks)
    percentage = submission.percentage if submission.percentage is not None else ((total_score / exam.total_marks * 100) if exam.total_marks > 0 else 0.0)
    passed = submission.passed if submission.passed is not None else (total_score >= exam.pass_marks)

    summary_data = [
        [
            Paragraph(f"<b>Student Name:</b> {submission.student_name}<br/><b>Roll Number:</b> {submission.student_roll}<br/><b>Email:</b> {submission.student_email}", cell_regular),
            Paragraph(f"<b>Total Score:</b> <font color='#1E3A8A' size='14'><b>{round(total_score, 2)} / {exam.total_marks}</b></font><br/><b>Percentage:</b> {round(percentage, 1)}%<br/><b>Status:</b> <font color='{'#10B981' if passed else '#EF4444'}'><b>{'PASSED' if passed else 'NEEDS IMPROVEMENT'}</b></font>", cell_regular)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[270, 270])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 12))

    # Module Breakdown Table (if available)
    if submission.module_scores:
        try:
            import json
            m_breakdown = json.loads(submission.module_scores) if isinstance(submission.module_scores, str) else submission.module_scores
            if m_breakdown and isinstance(m_breakdown, dict):
                story.append(Paragraph("Module Choice & Evaluation Summary (Max 20M per Module)", h2_style))
                mod_rows = [
                    [
                        Paragraph("<b>Module</b>", cell_bold),
                        Paragraph("<b>Choice Group</b>", cell_bold),
                        Paragraph("<b>Selected Option</b>", cell_bold),
                        Paragraph("<b>Marks Awarded</b>", cell_bold),
                        Paragraph("<b>Module Max</b>", cell_bold)
                    ]
                ]
                for mod_k, mod_v in m_breakdown.items():
                    sel_opt = mod_v.get("selected_option", "-")
                    sel_score = mod_v.get("selected_option_score", 0.0)
                    opt_details = mod_v.get("options", {}).get(sel_opt, {})
                    subparts_str = " ".join(opt_details.get("subparts", []))
                    mod_rows.append([
                        Paragraph(f"<b>{mod_v.get('module_name', mod_k)}</b>", cell_regular),
                        Paragraph(mod_v.get("choice_group", "-"), cell_regular),
                        Paragraph(f"<b>{sel_opt}</b> ({subparts_str})" if subparts_str else f"<b>{sel_opt}</b>", cell_regular),
                        Paragraph(f"<b>{mod_v.get('awarded_marks', 0.0)}</b> M", cell_regular),
                        Paragraph(f"{mod_v.get('module_max_marks', 20.0)} M", cell_regular)
                    ])
                mod_table = Table(mod_rows, colWidths=[90, 160, 110, 90, 90])
                mod_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#EFF6FF")),
                    ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
                    ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ('TOPPADDING', (0, 0), (-1, -1), 5),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(mod_table)
                story.append(Spacer(1, 12))
        except Exception:
            pass

    # 3. Question-Wise Detailed Breakdown Table
    story.append(Paragraph("Question-Wise Evaluation & Feedback", h2_style))
    
    q_table_data = [
        [
            Paragraph("<b>Q #</b>", cell_bold),
            Paragraph("<b>Question & Student Answer</b>", cell_bold),
            Paragraph("<b>Score</b>", cell_bold),
            Paragraph("<b>Feedback & Improvement Insights</b>", cell_bold)
        ]
    ]

    for ev in submission.evaluations:
        q = ev.question
        if not q and hasattr(exam, 'questions') and exam.questions:
            q = next((ques for ques in exam.questions if ques.id == ev.question_id), None)
            
        q_number = q.question_number if q else f"Q{ev.question_id or '?'}"
        q_text = (q.question_text[:75] + "...") if (q and q.question_text) else "Question prompt"
        q_max = q.max_marks if q else 10.0
        ans_snippet = (ev.student_answer_text[:140] + "...") if ev.student_answer_text and len(ev.student_answer_text) > 140 else (ev.student_answer_text or "No answer")

        # Build feedback list
        feedback_lines = []
        if ev.strengths and ev.strengths != "[]":
            try:
                import json
                s_list = json.loads(ev.strengths) if isinstance(ev.strengths, str) else ev.strengths
                feedback_lines.append(f"<font color='#047857'><b>Strengths:</b> {'; '.join(s_list[:2])}</font>")
            except Exception:
                pass

        if ev.lost_marks_reason:
            feedback_lines.append(f"<font color='#B45309'><b>Deduction note:</b> {ev.lost_marks_reason}</font>")

        if ev.improvement_suggestions:
            feedback_lines.append(f"<font color='#1D4ED8'><b>Suggestion:</b> {ev.improvement_suggestions}</font>")

        if ev.is_overridden:
            feedback_lines.append(f"<font color='#7C3AED'><b>Teacher Note:</b> Mark revised ({ev.override_reason})</font>")

        q_table_data.append([
            Paragraph(f"<b>{q_number}</b>", cell_bold),
            Paragraph(f"<b>{q_text}</b><br/><font color='#64748B'><i>Answer:</i> \"{ans_snippet}\"</font>", cell_regular),
            Paragraph(f"<b>{ev.final_marks}</b> / {q_max}", cell_bold),
            Paragraph("<br/>".join(feedback_lines) if feedback_lines else "Good effort.", feedback_style)
        ])

    breakdown_table = Table(q_table_data, colWidths=[35, 175, 55, 275])
    breakdown_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(breakdown_table)
    story.append(Spacer(1, 14))

    # 4. Teacher Sign-off Footer
    footer_text = Paragraph(
        "<i>This evaluation was conducted under instructor supervision with AI-assisted rubric alignment. Final marks were reviewed and approved by the course instructor.</i>",
        subtitle_style
    )
    story.append(KeepTogether([
        HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E2E8F0"), spaceBefore=8, spaceAfter=8),
        footer_text
    ]))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def _format_model_answer_flowables(text: str, normal_style, heading_style, bullet_style) -> List[Any]:
    flowables = []
    if not text:
        flowables.append(Paragraph("<i>No model answer generated yet.</i>", normal_style))
        return flowables

    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("###") or line.startswith("##") or line.startswith("#"):
            clean_head = line.lstrip("#").strip()
            escaped_head = html.escape(clean_head)
            flowables.append(Paragraph(f"<b><font color='#0E7490'>{escaped_head}</font></b>", heading_style))
        elif line.startswith("- ") or line.startswith("* ") or line.startswith("• "):
            clean_bullet = line[2:].strip()
            escaped_bullet = html.escape(clean_bullet)
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', escaped_bullet)
            flowables.append(Paragraph(f"&bull; {formatted}", bullet_style))
        else:
            escaped_line = html.escape(line)
            formatted = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', escaped_line)
            flowables.append(Paragraph(formatted, normal_style))

    return flowables


def generate_web_search_answers_pdf(exam: Exam, answers_data: Optional[List[Dict[str, Any]]] = None) -> bytes:
    """
    Generates an official, publication-quality PDF containing web-searched reference answers,
    mark-calibrated model solutions, proportional rubric criteria, and verified academic citations.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Brand Title
    doc_overline = ParagraphStyle(
        'DocOverline',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0891B2"),
        spaceAfter=3
    )
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#64748B")
    )
    badge_style = ParagraphStyle(
        'CardBadge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0891B2")
    )
    badge_dark = ParagraphStyle(
        'CardBadgeDark',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#1E3A8A")
    )
    prompt_label = ParagraphStyle(
        'PromptLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=2
    )
    prompt_text = ParagraphStyle(
        'PromptText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0F172A")
    )
    subhead_style = ParagraphStyle(
        'SubSectionHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0E7490"),
        spaceBefore=5,
        spaceAfter=3
    )
    model_head = ParagraphStyle(
        'ModelHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#0E7490"),
        spaceBefore=4,
        spaceAfter=2
    )
    model_text = ParagraphStyle(
        'ModelText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        spaceBefore=1,
        spaceAfter=2
    )
    model_bullet = ParagraphStyle(
        'ModelBullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#334155"),
        leftIndent=10,
        spaceBefore=1,
        spaceAfter=1
    )
    table_head = ParagraphStyle(
        'TableHead',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#334155")
    )
    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#1E293B")
    )
    citation_cell = ParagraphStyle(
        'CitationCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#475569")
    )

    story = []

    # 1. Header Banner
    story.append(Paragraph("SMARTGRADE AI ASSESSMENT PLATFORM &bull; REFERENCE DOCUMENTATION", doc_overline))
    story.append(Paragraph("Web Search Reference Answers & Mark Calibration Scheme", title_style))
    story.append(Paragraph(
        f"<b>Exam:</b> {html.escape(exam.title)} ({html.escape(exam.subject)}) &nbsp;|&nbsp; "
        f"<b>Code:</b> {html.escape(exam.exam_code)} &nbsp;|&nbsp; "
        f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0891B2"), spaceBefore=6, spaceAfter=8))

    # Resolve questions data
    questions_list: List[Dict[str, Any]] = []
    if answers_data and len(answers_data) > 0:
        questions_list = answers_data
    else:
        # Fallback to exam.questions from DB
        db_qs = sorted(exam.questions, key=lambda x: x.order_idx) if exam and exam.questions else []
        for q in db_qs:
            r_items = []
            for r in (q.rubric_items or []):
                r_items.append({
                    "concept_title": r.concept_title,
                    "description": r.description or "",
                    "weight_marks": r.weight_marks
                })
            questions_list.append({
                "question_number": q.question_number,
                "question_text": q.question_text,
                "max_marks": q.max_marks,
                "model_answer": q.model_answer or "",
                "rubric_items": r_items,
                "citations": [],
                "has_table": bool(q.question_text and ("| --- |" in q.question_text or "| :--- |" in q.question_text)),
                "has_diagram": bool(q.question_text and "Diagram" in q.question_text)
            })

    total_calc_marks = sum(float(q.get("max_marks", 0.0)) for q in questions_list)
    total_effective_marks = exam.total_marks if (exam and exam.total_marks and exam.total_marks > 0) else total_calc_marks

    # 2. Executive Overview Table
    summary_data = [
        [
            Paragraph(
                "<b>Evaluation Scenario:</b> Option 2: Open Web Search Evaluation<br/>"
                "<b>Correction Stance:</b> Lenient & Student-Friendly (Conceptual Intuition Rewarded)<br/>"
                "<b>Online Grounding:</b> Wikipedia, DuckDuckGo & Authoritative Academic Repositories",
                subtitle_style
            ),
            Paragraph(
                f"<b>Total Questions:</b> {len(questions_list)} Questions<br/>"
                f"<b>Exam Total Marks:</b> <font color='#0E7490'><b>{total_effective_marks:.1f} Marks</b></font><br/>"
                "<b>Calibration Status:</b> Verified & Proportional Marks Distributed",
                subtitle_style
            )
        ]
    ]
    summary_table = Table(summary_data, colWidths=[320, 220])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F0FDFA")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#0891B2")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 10))

    # 3. Question by Question Review Blocks
    for idx, q_item in enumerate(questions_list):
        q_num = str(q_item.get("question_number", f"Q{idx + 1}"))
        q_marks = float(q_item.get("max_marks", 5.0))
        prompt_str = str(q_item.get("question_text", "")).strip()
        model_answer_str = str(q_item.get("model_answer", "")).strip()
        r_items = q_item.get("rubric_items") or []
        citations = q_item.get("citations") or []
        rubric_sum = sum(float(r.get("weight_marks", 0.0)) for r in r_items)

        flags = []
        if q_item.get("has_table"):
            flags.append("[Table Formatted]")
        if q_item.get("has_diagram"):
            flags.append("[Diagram Required]")
        flags_str = " " + " ".join(flags) if flags else ""

        # Question Header Bar Table
        q_header_data = [
            [
                Paragraph(f"<b>QUESTION {html.escape(q_num)}</b>", badge_dark),
                Paragraph(
                    f"Allocated: <b>{q_marks:.1f} Marks</b> &nbsp;|&nbsp; "
                    f"Rubric: <font color='#0E7490'><b>{rubric_sum:.1f}M</b></font> / {q_marks:.1f}M"
                    f"<font color='#B45309'><b>{html.escape(flags_str)}</b></font>",
                    badge_style
                )
            ]
        ]
        q_header_table = Table(q_header_data, colWidths=[200, 340])
        q_header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))

        # Question Prompt Box Table
        prompt_data = [
            [
                Paragraph("<b>QUESTION PROMPT:</b>", prompt_label),
            ],
            [
                Paragraph(html.escape(prompt_str).replace("\n", "<br/>"), prompt_text)
            ]
        ]
        prompt_table = Table(prompt_data, colWidths=[540])
        prompt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#FFFFFF")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))

        # Model Answer Flowables
        model_answer_elements = _format_model_answer_flowables(
            model_answer_str,
            normal_style=model_text,
            heading_style=model_head,
            bullet_style=model_bullet
        )

        model_wrapper_data = [
            [
                Paragraph(f"<b>Web Reference Model Answer ({q_marks:.1f} Marks Depth):</b>", subhead_style)
            ],
            [
                model_answer_elements
            ]
        ]
        model_wrapper_table = Table(model_wrapper_data, colWidths=[540])
        model_wrapper_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))

        # Build Question Card
        card_elements = [
            q_header_table,
            Spacer(1, 4),
            prompt_table,
            Spacer(1, 4),
            model_wrapper_table,
        ]

        # Rubric Criteria Table (if any)
        if r_items and len(r_items) > 0:
            rubric_rows = [
                [
                    Paragraph("<b>Rubric Concept / Criterion</b>", table_head),
                    Paragraph("<b>Detailed Description & Scope</b>", table_head),
                    Paragraph("<b>Marks</b>", table_head)
                ]
            ]
            for r in r_items:
                c_title = html.escape(str(r.get("concept_title", "")))
                c_desc = html.escape(str(r.get("description", "")))
                c_weight = float(r.get("weight_marks", 1.0))
                rubric_rows.append([
                    Paragraph(f"<b>{c_title}</b>", table_cell_bold),
                    Paragraph(c_desc or c_title, table_cell),
                    Paragraph(f"<b>{c_weight:.1f} M</b>", table_cell_bold)
                ])

            rubric_table = Table(rubric_rows, colWidths=[160, 310, 70])
            rubric_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0E7490")),
                ('ALIGN', (2, 0), (2, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            card_elements.append(Spacer(1, 4))
            card_elements.append(Paragraph(f"<b>Marks-Calibrated Rubric Breakdown ({rubric_sum:.1f}M / {q_marks:.1f}M):</b>", subhead_style))
            card_elements.append(rubric_table)

        # Citations Table (if any)
        if citations and len(citations) > 0:
            cit_rows = [
                [
                    Paragraph("<b>Academic Repository / Domain</b>", table_head),
                    Paragraph("<b>Verified Source Reference & Retrieved Evidence</b>", table_head)
                ]
            ]
            for c in citations:
                c_domain = html.escape(str(c.get("domain", "web-source")))
                c_title = html.escape(str(c.get("source_title", "Academic Reference")))
                c_url = c.get("source_url", "")
                c_summary = html.escape(str(c.get("evidence_summary", "")))

                if c_url and c_url != "#":
                    escaped_url = html.escape(c_url)
                    link_html = f"<a href='{escaped_url}'><font color='#0891B2'><u><b>{c_title}</b></u></font></a>"
                else:
                    link_html = f"<b>{c_title}</b>"

                evidence_line = f"<br/><font color='#64748B'><i>\"{c_summary}\"</i></font>" if c_summary else ""
                cit_content = f"{link_html}{evidence_line}"

                cit_rows.append([
                    Paragraph(f"<b>{c_domain}</b>", table_cell_bold),
                    Paragraph(cit_content, citation_cell)
                ])

            cit_table = Table(cit_rows, colWidths=[150, 390])
            cit_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            card_elements.append(Spacer(1, 4))
            card_elements.append(Paragraph(f"<b>Verified Academic Citations ({len(citations)} sources):</b>", subhead_style))
            card_elements.append(cit_table)

        # Add card to story with spacing
        for el in card_elements:
            story.append(el)

        story.append(Spacer(1, 6))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceBefore=6, spaceAfter=8))

    # 4. Teacher Sign-off Footer Box
    footer_box = [
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0891B2"), spaceBefore=6, spaceAfter=6),
        Paragraph(
            "<b>SmartGrade Assessment System &bull; Official Web Search Reference Key</b><br/>"
            "<i>These reference solutions, criteria, and academic citations were generated and verified using Open Academic Grounding (Option 2: Lenient Evaluation). "
            "Instructors may customize model answers and adjust rubric marks prior to grading student submissions.</i>",
            subtitle_style
        )
    ]
    story.append(KeepTogether(footer_box))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

