import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Play, Sparkles, CheckCircle2, ShieldAlert, 
  ArrowRight, RefreshCw, Layers, BookOpen, Globe, CheckCircle
} from 'lucide-react';
import { examsApi, gradingApi } from '../api/client';
import { Badge, GradingModeBadge } from '../components/Badge';

export const GradingConsole = ({ examId, setView }) => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState(null);

  const fetchExam = async () => {
    setLoading(true);
    try {
      const res = await examsApi.get(examId);
      setExam(res.data);
    } catch (err) {
      console.error('Error loading exam:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchExam();
  }, [examId]);

  const handleRunGrading = async () => {
    setGrading(true);
    setGradeResult(null);
    try {
      const res = await gradingApi.runGrading(examId);
      setGradeResult(res.data);
      await fetchExam();
    } catch (err) {
      alert('Grading failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGrading(false);
    }
  };

  if (loading && !exam) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <div className="text-slate-600 font-medium text-sm">Loading AI Grading Engine...</div>
      </div>
    );
  }

  const isScenarioB = exam?.grading_mode === 'rubric_web_validated';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setView('review')}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <span>Open Teacher Review Matrix</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Console Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GradingModeBadge mode={exam?.grading_mode} />
              <span className="text-slate-300">•</span>
              <span className="text-xs font-mono font-medium text-slate-500">Code: {exam?.exam_code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{exam?.title}</h1>
            <p className="text-sm text-slate-500 mt-1">
              AI-Assisted Assessment Engine Console
            </p>
          </div>

          <button
            onClick={handleRunGrading}
            disabled={grading}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2.5 shadow-md shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {grading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            <span>{grading ? 'Evaluating Submissions...' : 'Run AI Evaluation'}</span>
          </button>
        </div>

        {/* Engine Mechanism Overview Box */}
        <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>How This Evaluation Operates</span>
          </h4>
          {isScenarioB ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-900">
                <Globe className="w-4 h-4 text-cyan-600" />
                <span>Option 2: Open Web Search Evaluation (Lenient Correction Mode)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The AI grader automatically queries authoritative web sources (Wikipedia, DuckDuckGo, academic repositories) for each question on the question paper. Submissions receive <b>lenient, student-friendly correction</b> that rewards conceptual intuition and understanding generously, surfacing citations and web evidence for teacher transparency.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Option 1: Notes & Rubric Grounded (Moderate Correction Mode)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                The AI evaluates student answers against your uploaded lecture notes, syllabus, and rubric using <b>moderate, balanced correction</b>. The engine gives generous partial credit for core understanding and forgives slight wording variations rather than being overly strict.
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Summary Card */}
        {gradeResult && (
          <div className="p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-900">
                  AI Evaluation Completed Successfully!
                </h3>
                <p className="text-xs text-emerald-700">
                  Graded {gradeResult.graded_submissions} student script(s).
                </p>
              </div>
            </div>

            {/* Quick Result Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {gradeResult.results?.map((r, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900">{r.student_name || r.student_roll}</span>
                      <span className="block text-[11px] text-slate-500 font-mono">{r.student_roll}</span>
                    </div>
                    <Badge variant="success" size="sm">{r.score} / 50M ({r.percentage}%)</Badge>
                  </div>
                  {r.module_breakdown && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                      {Object.entries(r.module_breakdown).map(([modName, modInfo]) => (
                        <span key={modName} className="text-[10px] px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-700 font-mono">
                          {modName} ({modInfo.selected_option}): <b className="text-emerald-700 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setView('review')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all"
              >
                <span>Proceed to Review & Overrides Matrix</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
