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
    return <div className="p-12 text-center text-slate-400">Loading AI Grading Engine...</div>;
  }

  const isScenarioB = exam?.grading_mode === 'rubric_web_validated';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('dashboard')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <button
          onClick={() => setView('review')}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-600/30 cursor-pointer"
        >
          Open Teacher Review Matrix <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Console Card */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GradingModeBadge mode={exam?.grading_mode} />
              <span className="text-xs text-slate-400">Code: {exam?.exam_code}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">{exam?.title}</h1>
            <p className="text-sm text-slate-400 mt-1">
              AI-Assisted Assessment Engine Console
            </p>
          </div>

          <button
            onClick={handleRunGrading}
            disabled={grading}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-indigo-600/30 hover:scale-102 transition-all cursor-pointer disabled:opacity-50"
          >
            {grading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Play className="w-5 h-5 fill-current" />
            )}
            {grading ? 'Evaluating Submissions...' : 'Run AI Evaluation'}
          </button>
        </div>

        {/* Engine Mechanism Overview Box */}
        <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> How This Evaluation Operates
          </h4>
          {isScenarioB ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Option 2: Open Web Search Evaluation (Lenient Correction Mode)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The AI grader automatically queries authoritative web sources (Wikipedia, DuckDuckGo, academic repositories) for each question on the question paper. Submissions receive <b>lenient, student-friendly correction</b> that rewards conceptual intuition and understanding generously, surfacing citations and web evidence for teacher transparency.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Option 1: Notes & Rubric Grounded (Moderate Correction Mode)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                The AI evaluates student answers against your uploaded lecture notes, syllabus, and rubric using <b>moderate, balanced correction</b>. The engine gives generous partial credit for core understanding and forgives slight wording variations rather than being overly strict.
              </p>
            </div>
          )}
        </div>

        {/* Evaluation Summary Card */}
        {gradeResult && (
          <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-emerald-300">
                  AI Evaluation Completed Successfully!
                </h3>
                <p className="text-xs text-emerald-400/80">
                  Graded {gradeResult.graded_submissions} student script(s).
                </p>
              </div>
            </div>

            {/* Quick Result Chips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {gradeResult.results?.map((r, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-100">{r.student_name || r.student_roll}</span>
                      <span className="block text-[11px] text-slate-400 font-mono">{r.student_roll}</span>
                    </div>
                    <Badge variant="success" size="sm">{r.score} / 50M ({r.percentage}%)</Badge>
                  </div>
                  {r.module_breakdown && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
                      {Object.entries(r.module_breakdown).map(([modName, modInfo]) => (
                        <span key={modName} className="text-[10px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                          {modName} ({modInfo.selected_option}): <b className="text-emerald-400 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
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
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Proceed to Review & Overrides Matrix <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
