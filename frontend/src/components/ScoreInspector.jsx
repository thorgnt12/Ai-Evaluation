import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, AlertCircle, ExternalLink, 
  Sparkles, History, Edit3, ShieldAlert, BookOpen, Globe
} from 'lucide-react';
import { Badge, OCRBadge } from './Badge';
import { reviewApi } from '../api/client';

export const ScoreInspector = ({ 
  isOpen, 
  onClose, 
  question, 
  student, 
  scoreData, 
  gradingMode, 
  onOverrideSaved 
}) => {
  const [overrideMarks, setOverrideMarks] = useState(scoreData?.final_marks ?? 0);
  const [overrideReason, setOverrideReason] = useState(scoreData?.override_reason || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (scoreData) {
      setOverrideMarks(scoreData.final_marks ?? 0);
      setOverrideReason(scoreData.override_reason || '');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [scoreData]);

  if (!isOpen || !question || !student || !scoreData) return null;

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!scoreData.evaluation_id) {
      setErrorMsg('No evaluation record exists to override. Please run AI grading first.');
      return;
    }
    if (!overrideReason || overrideReason.trim().length < 3) {
      setErrorMsg('A mandatory written rationale is required to override marks.');
      return;
    }
    const numMarks = parseFloat(overrideMarks);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > question.max_marks) {
      setErrorMsg(`Marks must be a number between 0.0 and ${question.max_marks}.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await reviewApi.overrideMark(scoreData.evaluation_id, {
        evaluation_id: scoreData.evaluation_id,
        new_marks: numMarks,
        reason: overrideReason.trim()
      });
      setSuccessMsg('Mark override recorded in audit trail!');
      setTimeout(() => {
        setSuccessMsg('');
        if (onOverrideSaved) onOverrideSaved();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Failed to save mark override');
    } finally {
      setSubmitting(false);
    }
  };

  const hasContradictions = scoreData.contradictions && scoreData.contradictions.length > 0;
  const webEvidence = scoreData.web_evidence || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-3xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-10 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Score Inspector: {question.question_number}
              </h2>
              <Badge variant="primary" size="md">
                Max {question.max_marks} Marks
              </Badge>
              {question.module_name && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-medium">
                  {question.module_name} ({question.main_question || 'Option'}) • Max 20M Module
                </span>
              )}
              {scoreData.is_overridden && (
                <Badge variant="warning" size="md">
                  Teacher Overridden
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Student: <span className="text-slate-700 dark:text-slate-200 font-medium">{student.student_name}</span> ({student.student_roll})
              {student.student_email && (
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 ml-2">({student.student_email})</span>
              )}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Question Prompt */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-500" /> Question Prompt
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
              {question.question_text}
            </p>
          </div>

          {/* Student Answer */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Student Submitted Answer
              </h4>
              <OCRBadge confidence={student.ocr_confidence} isVerified={student.is_ocr_verified} />
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-600 dark:text-slate-200 font-mono leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-700">
              {scoreData.student_answer ? (
                scoreData.student_answer
              ) : (
                <span className="text-slate-400 italic flex items-center gap-2 font-sans text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  No answer submitted for this question (Student did not attempt or chose alternate option).
                </span>
              )}
            </div>
          </div>

          {/* Contradiction & Negation Alerts */}
          {hasContradictions && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm mb-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Contradiction & Negation Warning Detected
              </div>
              <ul className="space-y-1 text-xs text-rose-600 dark:text-rose-300">
                {scoreData.contradictions.map((c, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-500">•</span>
                    <span>{c.detected || JSON.stringify(c)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-rose-500 dark:text-rose-400 mt-2 italic">
                AI penalized marks due to conflicting polarity. Please review manually.
              </p>
            </div>
          )}

          {/* Rubric Criteria Checklist */}
          {question.rubrics && question.rubrics.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Teacher Rubric Concept Breakdown
              </h4>
              <div className="space-y-2">
                {question.rubrics.map((r) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{r.concept_title}</span>
                      {r.keywords && (
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          Keywords: {r.keywords}
                        </p>
                      )}
                    </div>
                    <Badge variant="primary" size="sm">
                      {r.weight_marks}M
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Option 1: Moderate Correction Banner */}
          {(gradingMode === 'notes_grounded' || gradingMode === 'option_1' || gradingMode !== 'rubric_web_validated') && webEvidence.length === 0 && (
            <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-xs">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold mb-1">
                <BookOpen className="w-4 h-4 text-indigo-500" />
                Option 1: Notes & Rubric Grounded (Moderate Correction)
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                Evaluated against teacher reference notes and marking rubric using <b>moderate, balanced correction</b>. Generous partial marks are awarded for core understanding without penalizing strict phrasing.
              </p>
            </div>
          )}

          {/* Option 2: Web Validation Citations Evidence */}
          {(gradingMode === 'rubric_web_validated' || gradingMode === 'open_web_search' || gradingMode === 'web_search_lenient' || gradingMode === 'option_2' || webEvidence.length > 0) && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/50">
              <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-semibold text-sm mb-1">
                <Globe className="w-4 h-4 text-teal-500" />
                Option 2: Web Search Reference Citations & Evidence
              </div>
              <p className="text-xs text-teal-600 dark:text-teal-400 mb-3">
                Live web references (Wikipedia, DuckDuckGo, Academic repositories) retrieved and evaluated with <b>lenient, student-friendly correction</b>:
              </p>
              <div className="space-y-2">
                {webEvidence.map((ev, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-teal-100 dark:border-teal-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700 dark:text-slate-200">{ev.source_title}</span>
                      <a 
                        href={ev.source_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        {ev.domain} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 italic">
                      "{ev.evidence_summary}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Structured Feedback */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" /> AI Feedback & Rationale
            </h4>
            
            {/* Strengths */}
            {scoreData.strengths && scoreData.strengths.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Strengths:</span>
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                  {scoreData.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missed Concepts */}
            {scoreData.missed_concepts && scoreData.missed_concepts.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Missed Points / Gaps:</span>
                <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 mt-1 space-y-0.5">
                  {scoreData.missed_concepts.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Lost Marks Rationale */}
            {scoreData.lost_marks_reason && (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Deduction Reason: </span>
                {scoreData.lost_marks_reason}
              </div>
            )}

            {/* Improvement Suggestions */}
            {scoreData.improvement_suggestions && (
              <div className="text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <span className="font-semibold">Suggestion: </span>
                {scoreData.improvement_suggestions}
              </div>
            )}
          </div>

          {/* Teacher Mark Override Form */}
          <form onSubmit={handleSaveOverride} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-500" /> Instructor Mark Override
              </h4>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                AI Awarded: <span className="font-bold text-slate-700 dark:text-slate-200">{scoreData.ai_marks}</span> / {question.max_marks}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-600 dark:text-emerald-400">
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Final Marks
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={question.max_marks}
                  value={overrideMarks}
                  onChange={(e) => setOverrideMarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Mandatory Written Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Awarded partial credit for correct logic..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <History className="w-4 h-4" />
              {submitting ? 'Saving to Audit Trail...' : 'Save Override & Record in Audit Trail'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
