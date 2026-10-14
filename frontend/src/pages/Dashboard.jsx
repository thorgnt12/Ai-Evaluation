import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, BookOpen, Users, CheckCircle, AlertTriangle, 
  BarChart3, FileSpreadsheet, Eye, Play, Sparkles, ArrowRight, ShieldCheck,
  Trash2, AlertCircle, Loader2
} from 'lucide-react';
import { examsApi, seedApi } from '../api/client';
import { Badge, GradingModeBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const Dashboard = ({ setView, setSelectedExamId, onExamSelect }) => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examToDelete, setExamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleConfirmDelete = async () => {
    if (!examToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await examsApi.delete(examToDelete.id);
      setToastMessage(`Exam "${examToDelete.title}" has been successfully deleted.`);
      setTimeout(() => setToastMessage(null), 4000);
      setExamToDelete(null);
      await fetchExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete the exam. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const res = await examsApi.list();
      setExams(res.data);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'finalized':
        return <Badge variant="success">Finalized & Published</Badge>;
      case 'in_review':
        return <Badge variant="warning">In Teacher Review</Badge>;
      case 'graded':
        return <Badge variant="purple">AI Graded</Badge>;
      case 'ocr_pending':
        return <Badge variant="danger">OCR Gate Pending</Badge>;
      case 'ingestion':
        return <Badge variant="cyan">Ingesting Docs</Badge>;
      default:
        return <Badge variant="default">Draft Setup</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between shadow-lg backdrop-blur-md animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-400/70 hover:text-emerald-300 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                Evaluation Hub
              </span>
              <span className="text-xs text-slate-400">Teacher in Full Control</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
              Assessments & Grading Workspaces
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Create exams, ingest question papers & rubrics, extract OCR text with confidence gates, evaluate with dual-scenario AI, and finalize marks with an immutable audit trail.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('wizard')}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-102 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Create New Exam
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Exams
          </div>
          <div className="text-2xl font-black text-slate-100">{exams.length}</div>
          <div className="text-xs text-indigo-400 mt-1">Dual-mode supported</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Submissions
          </div>
          <div className="text-2xl font-black text-slate-100">
            {exams.reduce((acc, curr) => acc + (curr.total_submissions || 0), 0)}
          </div>
          <div className="text-xs text-emerald-400 mt-1">OCR scanned & digital</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Graded Submissions
          </div>
          <div className="text-2xl font-black text-indigo-400">
            {exams.reduce((acc, curr) => acc + (curr.graded_count || 0), 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">AI Evaluated</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Finalized Exams
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {exams.filter(e => e.status === 'finalized').length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Published to students</div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-200">Active Exams & Workspaces</h2>
          <span className="text-xs text-slate-400">Click any action below to navigate workflow</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center space-y-4 border border-dashed border-slate-700">
            <BookOpen className="w-12 h-12 text-indigo-400 mx-auto opacity-70" />
            <h3 className="text-lg font-semibold text-slate-200">No Exams Created Yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Get started by creating a new exam or seed our sample Scenario A & Scenario B datasets.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setView('wizard')}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 cursor-pointer"
              >
                Create Exam
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id}
                className="glass-card rounded-3xl p-6 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-5"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <GradingModeBadge mode={exam.grading_mode} />
                    <div className="flex items-center gap-2">
                      {getStatusBadge(exam.status)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExamToDelete(exam);
                        }}
                        title={`Delete ${exam.title}`}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                    <span>{exam.subject}</span>
                    <span>•</span>
                    <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                      Code: {exam.exam_code}
                    </span>
                    <span>•</span>
                    <span>{exam.term}</span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-800/80 text-center">
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">Total Marks</div>
                      <div className="text-sm font-bold text-slate-200">{exam.total_marks}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">Pass Marks</div>
                      <div className="text-sm font-bold text-slate-200">{exam.pass_marks}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">Questions</div>
                      <div className="text-sm font-bold text-slate-200">{exam.total_questions}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">Submissions</div>
                      <div className="text-sm font-bold text-slate-200">{exam.total_submissions}</div>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('submissions');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      Submissions & Scripts
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('grading');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-400" />
                      AI Grading Engine
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('review');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      Review Matrix
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('analytics');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                      Analytics
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('reports');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      Reports
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Exam Confirmation Modal */}
      <Modal
        isOpen={!!examToDelete}
        onClose={() => {
          if (!isDeleting) {
            setExamToDelete(null);
            setDeleteError(null);
          }
        }}
        title="Delete Examination Workspace"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">This action cannot be undone.</p>
              <p className="text-xs text-rose-300/80 leading-relaxed">
                Deleting <span className="font-bold text-rose-100">"{examToDelete?.title}"</span> will permanently remove the exam configuration, questions, rubrics, and all {examToDelete?.total_submissions || 0} student evaluation records.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              {deleteError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setExamToDelete(null);
                setDeleteError(null);
              }}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Deleting Exam...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Yes, Delete Exam
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
