import io
import os
from datetime import datetime
from typing import List, Dict, Any

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable

from ..models.exam import Exam
from ..models.submission import Submission
from ..models.question import Question
from ..models.evaluation import AnswerEvaluation

def generate_excel_marksheet(exam: Exam) -> bytes:
    """
    Generates a professional, multi-sheet Excel marksheet with openpyxl.
    - Sheet 1: Master Marksheet
    - Sheet 2: Class Analytics Summary
    - Sheet 3: Question-Level Performance
    """
    wb = openpyxl.Workbook()
    
    # Define styles
    header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
    accent_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    green_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    red_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    title_font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
    bold_font = Font(name="Calibri", size=10, bold=True)
    regular_font = Font(name="Calibri", size=10)
    
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB')
    )
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')

    # -------------------------------------------------------------
    # SHEET 1: Master Marksheet
    # -------------------------------------------------------------
    ws1 = wb.active
    ws1.title = "Master Marksheet"
    ws1.views.sheetView[0].showGridLines = True

    # Title Block
    ws1["A1"] = f"{exam.title} - Official Results Marksheet"
    ws1["A1"].font = title_font
    ws1["A2"] = f"Subject: {exam.subject} | Code: {exam.exam_code} | Mode: {exam.grading_mode.replace('_', ' ').title()} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    ws1["A2"].font = Font(name="Calibri", size=10, italic=True, color="6B7280")

    # Table Headers
    questions: List[Question] = sorted(exam.questions, key=lambda q: q.order_idx)
    base_headers = ["Roll No", "Student Name", "Email"]
    q_headers = [f"{q.question_number} ({q.max_marks}M)" for q in questions]
    end_headers = ["Total Score", "Max Marks", "Percentage", "Result", "Teacher Overridden?"]
    all_headers = base_headers + q_headers + end_headers

    row_idx = 4
    for col_idx, h in enumerate(all_headers, 1):
        cell = ws1.cell(row=row_idx, column=col_idx, value=h)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = center_align
        cell.border = thin_border
    
    # Populate Student Rows
    submissions = sorted(exam.submissions, key=lambda s: s.student_roll)
    for sub in submissions:
        row_idx += 1
        total_score = sub.total_awarded_marks if sub.total_awarded_marks is not None else min(exam.total_marks, sum(e.final_marks for e in sub.evaluations) + exam.grace_marks)
        pct = sub.percentage if sub.percentage is not None else ((total_score / exam.total_marks * 100) if exam.total_marks > 0 else 0.0)
        passed = sub.passed if sub.passed is not None else (total_score >= exam.pass_marks)
        has_override = any(e.is_overridden for e in sub.evaluations)

        ws1.cell(row=row_idx, column=1, value=sub.student_roll).alignment = center_align
        ws1.cell(row=row_idx, column=2, value=sub.student_name).alignment = left_align
        ws1.cell(row=row_idx, column=3, value=sub.student_email).alignment = left_align

        # Question marks
        col_offset = 4
        for q in questions:
            ev = next((e for e in sub.evaluations if e.question_id == q.id), None)
            val = ev.final_marks if ev else 0.0
            q_cell = ws1.cell(row=row_idx, column=col_offset, value=val)
            q_cell.alignment = center_align
            if ev and ev.is_overridden:
                q_cell.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
            col_offset += 1

        ws1.cell(row=row_idx, column=col_offset, value=round(total_score, 2)).alignment = center_align
        ws1.cell(row=row_idx, column=col_offset + 1, value=exam.total_marks).alignment = center_align
        ws1.cell(row=row_idx, column=col_offset + 2, value=f"{round(pct, 1)}%").alignment = center_align
        
        res_cell = ws1.cell(row=row_idx, column=col_offset + 3, value="PASS" if passed else "FAIL")
        res_cell.alignment = center_align
        res_cell.fill = green_fill if passed else red_fill
        res_cell.font = Font(name="Calibri", size=10, bold=True, color="065F46" if passed else "991B1B")

        ws1.cell(row=row_idx, column=col_offset + 4, value="Yes (Reason Recorded)" if has_override else "No").alignment = center_align

        # Set borders
        for col_idx in range(1, len(all_headers) + 1):
            ws1.cell(row=row_idx, column=col_idx).border = thin_border
            ws1.cell(row=row_idx, column=col_idx).font = regular_font

    # Adjust column widths
    for col in ws1.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws1.column_dimensions[col_letter].width = max(max_len + 4, 12)

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
