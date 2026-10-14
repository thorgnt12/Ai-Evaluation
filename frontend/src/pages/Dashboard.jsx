import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, BookOpen, Users, CheckCircle, AlertTriangle, 
  BarChart3, FileSpreadsheet, Eye, Play, Sparkles, ArrowRight, ShieldCheck,
  Trash2, AlertCircle, Loader2, Award, Clock, ArrowUpRight
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner - LMS Modern Light Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-950 p-8 sm:p-10 text-white shadow-xl shadow-indigo-900/10">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-12 w-64 h-64 rounded-full bg-violet-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-indigo-200 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Assessment & Evaluation Management</span>
              <span className="text-white/40">•</span>
              <span className="text-white/80">Teacher-in-the-Loop</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Assessments & Grading Workspaces
            </h1>
            
            <p className="text-indigo-100/90 text-sm sm:text-base leading-relaxed">
              Create exams, ingest rubrics & question papers, extract handwritten OCR text with confidence validation, and execute dual-scenario AI evaluations with full audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setView('wizard')}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer active:translate-y-0"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Create New Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Total Exams
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">{exams.length}</div>
            <div className="text-xs font-medium text-indigo-600 mt-2 flex items-center gap-1">
              Dual-mode supported
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Total Submissions
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {exams.reduce((acc, curr) => acc + (curr.total_submissions || 0), 0)}
            </div>
            <div className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
              OCR scanned & digital
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Graded Submissions
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {exams.reduce((acc, curr) => acc + (curr.graded_count || 0), 0)}
            </div>
            <div className="text-xs font-medium text-violet-600 mt-2 flex items-center gap-1">
              AI Evaluated with Rubrics
            </div>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Finalized Exams
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mt-1">
              {exams.filter(e => e.status === 'finalized').length}
            </div>
            <div className="text-xs font-medium text-slate-600 mt-2 flex items-center gap-1">
              Published to student portals
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Active Exams & Workspaces</h2>
            <p className="text-xs text-slate-500 mt-0.5">Manage and track evaluation workflows from creation to publication</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-auto">
            {exams.length} {exams.length === 1 ? 'Exam' : 'Exams'} in System
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
            <div className="text-slate-600 font-medium text-sm">Loading examination workspaces...</div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center space-y-4 border-2 border-dashed border-slate-300 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Exams Created Yet</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Get started by creating a new exam workspace or use our pre-configured evaluation templates.
            </p>
            <div className="pt-2">
              <button
                onClick={() => setView('wizard')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Create Exam Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-5 group"
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
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {exam.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-slate-700">{exam.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                      Code: {exam.exam_code}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>{exam.term}</span>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Total Marks</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{exam.total_marks}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Pass Marks</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{exam.pass_marks}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Questions</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{exam.total_questions}</div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Submissions</div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">{exam.total_submissions}</div>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('submissions');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:border-slate-300"
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Submissions & Scripts</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('grading');
                      }}
                      className="py-2.5 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:border-indigo-300"
                    >
                      <Play className="w-3.5 h-3.5 text-indigo-600" />
                      <span>AI Grading Engine</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('review');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Review Matrix</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('analytics');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
                      <span>Analytics</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedExamId(exam.id);
                        setView('reports');
                      }}
                      className="py-2 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Reports</span>
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
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900">This action cannot be undone.</p>
              <p className="text-xs text-rose-700 leading-relaxed">
                Deleting <span className="font-semibold text-rose-900">"{examToDelete?.title}"</span> will permanently remove the exam configuration, questions, rubrics, and all {examToDelete?.total_submissions || 0} student evaluation records.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setExamToDelete(null);
                setDeleteError(null);
              }}
              className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting Exam...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete Exam</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
