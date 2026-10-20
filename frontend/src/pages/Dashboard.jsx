import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, BookOpen, Users, CheckCircle, AlertTriangle, 
  BarChart3, FileSpreadsheet, Eye, Play, Sparkles, ArrowRight, ShieldCheck,
  Trash2, AlertCircle, Loader2, Award, Clock, ArrowUpRight, Upload, Globe, Download,
  UserCheck, Search, X, Filter, CheckCircle2
} from 'lucide-react';
import { examsApi, seedApi, reportsApi } from '../api/client';
import { Badge, GradingModeBadge } from '../components/Badge';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';

export const Dashboard = ({ setView, setSelectedExamId, onExamSelect, onCreateExam, onResumeExam }) => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examToDelete, setExamToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'ingestion', 'ocr_pending', 'graded', 'finalized'

  // Teacher Assignment / Delegation State
  const [assigningExam, setAssigningExam] = useState(null);
  const [teachersList, setTeachersList] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const openAssignModal = async (exam) => {
    setAssigningExam(exam);
    setSelectedTeacherId(exam.assigned_teacher_id ? String(exam.assigned_teacher_id) : '');
    try {
      const res = await examsApi.getTeachers();
      setTeachersList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
    }
  };

  const handleSaveAssignment = async () => {
    if (!assigningExam) return;
    setIsAssigning(true);
    try {
      const teacherId = selectedTeacherId ? parseInt(selectedTeacherId) : null;
      await examsApi.assignTeacher(assigningExam.id, teacherId);
      setToastMessage(teacherId ? 'Exam delegated successfully to faculty member!' : 'Exam assignment cleared.');
      setTimeout(() => setToastMessage(null), 4000);
      setAssigningExam(null);
      await fetchExams();
    } catch (err) {
      console.error("Error assigning teacher:", err);
      alert(err.response?.data?.detail || "Failed to assign teacher.");
    } finally {
      setIsAssigning(false);
    }
  };

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

  const filteredExams = exams.filter(exam => {
    const matchesSearch = !searchQuery || 
      (exam.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.exam_code?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exam.subject?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'ingestion') return exam.status === 'ingestion' || exam.status === 'draft';
    if (statusFilter === 'ocr_pending') return exam.status === 'ocr_pending';
    if (statusFilter === 'graded') return exam.status === 'graded' || exam.status === 'in_review';
    if (statusFilter === 'finalized') return exam.status === 'finalized';
    return true;
  });

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
              onClick={() => {
                if (onCreateExam) {
                  onCreateExam();
                } else {
                  setSelectedExamId(null);
                  setView('wizard');
                }
              }}
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer active:translate-y-0"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              <span>Create New Exam</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary KPIs - Interactive Filter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`rounded-2xl p-6 border transition-all flex items-start justify-between cursor-pointer select-none ${
            statusFilter === 'all'
              ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          title="Click to view all examinations"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Total Exams
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{exams.length}</div>
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-2 flex items-center gap-1">
              Dual-mode supported
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('ocr_pending')}
          className={`rounded-2xl p-6 border transition-all flex items-start justify-between cursor-pointer select-none ${
            statusFilter === 'ocr_pending'
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          title="Click to filter by exams with pending or active submissions"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Total Submissions
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {exams.reduce((acc, curr) => acc + (curr.total_submissions || 0), 0)}
            </div>
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
              OCR scanned & digital
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'graded' ? 'all' : 'graded')}
          className={`rounded-2xl p-6 border transition-all flex items-start justify-between cursor-pointer select-none ${
            statusFilter === 'graded'
              ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 shadow-md ring-2 ring-violet-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          title="Click to filter by graded exams ready for review"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Graded Submissions
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {exams.reduce((acc, curr) => acc + (curr.graded_count || 0), 0)}
            </div>
            <div className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-2 flex items-center gap-1">
              AI Evaluated with Rubrics
            </div>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-800">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'finalized' ? 'all' : 'finalized')}
          className={`rounded-2xl p-6 border transition-all flex items-start justify-between cursor-pointer select-none ${
            statusFilter === 'finalized'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
          }`}
          title="Click to filter by published finalized exams"
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Finalized Exams
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {exams.filter(e => e.status === 'finalized').length}
            </div>
            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
              Published to student portals
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="space-y-4">
        {/* Role View Banner */}
        {(user?.role === 'admin' || user?.role === 'college_admin') ? (
          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-purple-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                👑
              </span>
              <div>
                <span className="font-bold text-purple-950">College Admin View (All Institutional Examinations)</span>
                <p className="text-purple-700 text-[11px] mt-0.5">
                  You have full administrative visibility across all departments and faculty exams. Individual teachers only see exams they created.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-purple-200 font-mono font-bold text-purple-800 text-[11px] shrink-0 self-start sm:self-auto">
              College Admin • {exams.length} Total Exams
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-900 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-100 font-bold rounded text-indigo-800 text-[10px] uppercase tracking-wide">
                Faculty Workspace
              </span>
              <span className="text-slate-700 font-medium">
                Showing examinations assigned to you or created by you ({user?.full_name || 'Course Teacher'}).
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-mono font-bold text-indigo-800 text-[11px] shrink-0 self-start sm:self-auto">
              {exams.length} {exams.length === 1 ? 'Assigned Task' : 'Assigned Tasks'}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {(user?.role === 'admin' || user?.role === 'college_admin') ? 'All College Examinations' : 'My Assigned Examinations'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage and track evaluation workflows from creation to publication</p>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, title, subject..."
                className="pl-8 pr-7 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-48 sm:w-56 shadow-2xs font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80">
              {[
                { id: 'all', label: 'All' },
                { id: 'ingestion', label: 'Docs' },
                { id: 'ocr_pending', label: 'OCR' },
                { id: 'graded', label: 'Graded' },
                { id: 'finalized', label: 'Finalized' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
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
            <h3 className="text-lg font-bold text-slate-900">
              {(user?.role === 'admin' || user?.role === 'college_admin') ? 'No Exams Created Yet' : 'No Evaluation Tasks Assigned'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {(user?.role === 'admin' || user?.role === 'college_admin')
                ? 'Get started by creating a new exam workspace or use our pre-configured evaluation templates.'
                : 'You currently have no examination tasks assigned to you. When the College Admin delegates an exam to you, it will appear here.'}
            </p>
            {(user?.role === 'admin' || user?.role === 'college_admin') && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onCreateExam) {
                      onCreateExam();
                    } else {
                      setSelectedExamId(null);
                      setView('wizard');
                    }
                  }}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Create Exam Workspace
                </button>
              </div>
            )}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 text-center space-y-3 border border-slate-200 dark:border-slate-800 shadow-sm">
            <Search className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No exams match your filter</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No examinations found matching "{searchQuery || statusFilter}". Try clearing your search or status filter.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredExams.map((exam) => {
              const isWebSearch = [
                'rubric_web_validated', 'open_web_search', 
                'web_search_lenient', 'option_2', 'web_search'
              ].includes(exam.grading_mode);

              const hasQP = Boolean(exam.has_question_paper) || 
                            (exam.total_questions > 0) || 
                            Boolean(exam.question_paper_path) || 
                            Boolean(exam.question_paper_text);

              const hasRubricDoc = Boolean(exam.marking_scheme_path) || 
                                   Boolean(exam.notes_document_path) || 
                                   Boolean(exam.notes_extracted_text) ||
                                   Boolean(exam.has_rubric);

              const hasApprovedWebAnswers = isWebSearch && (
                Boolean(exam.marking_scheme_path) || 
                Boolean(exam.marking_scheme_text) ||
                (exam.status !== 'draft' && Boolean(exam.has_evaluation_scheme))
              );

              // Determine exact setupStatus
              let setupStatus = exam.setup_status;
              if (!setupStatus) {
                if (!hasQP) {
                  setupStatus = 'needs_qp';
                } else if (isWebSearch) {
                  setupStatus = hasApprovedWebAnswers ? 'complete' : 'web_answers_ready';
                } else {
                  setupStatus = hasRubricDoc ? 'complete' : 'rubric_required';
                }
              }

              const isWebAnswersReady = setupStatus === 'web_answers_ready';
              const isRubricRequired = setupStatus === 'rubric_required';
              const isNeedsQP = setupStatus === 'needs_qp';
              const isSetupIncomplete = isNeedsQP || isRubricRequired || isWebAnswersReady;

              return (
              <div 
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-5 group"
              >
                {/* Top Info */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <GradingModeBadge mode={exam.grading_mode} />
                    <div className="flex items-center gap-2">
                      {isSetupIncomplete ? (
                        isWebAnswersReady ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1 shadow-2xs">
                            <Sparkles className="w-3 h-3 text-cyan-600" />
                            Web Searched Answer Ready to Review
                          </span>
                        ) : isRubricRequired ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Rubric Not Uploaded
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            {isWebSearch ? "Question Paper Required" : "QP & Rubric Required"}
                          </span>
                        )
                      ) : (
                        getStatusBadge(exam.status)
                      )}
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

                  <h3 
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      if (isSetupIncomplete) {
                        if (onResumeExam) {
                          onResumeExam(exam.id);
                        } else {
                          setView('wizard');
                        }
                      } else {
                        setView('submissions');
                      }
                    }}
                    className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    {exam.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-slate-700">{exam.subject}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                      Code: {exam.exam_code}
                    </span>
                    {exam.created_by_name && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          👤 Creator: <b className="text-indigo-700">{exam.created_by_name}</b>
                        </span>
                      </>
                    )}
                    {exam.assigned_teacher_name ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          🎯 Evaluator: <b className="text-purple-900">{exam.assigned_teacher_name}</b>
                        </span>
                      </>
                    ) : (user?.role === 'admin' || user?.role === 'college_admin') ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          Unassigned
                        </span>
                      </>
                    ) : null}
                    <span className="text-slate-300">•</span>
                    <span>{exam.term}</span>
                  </div>

                  {/* Delegation Badges & Actions */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {(user?.role === 'admin' || user?.role === 'college_admin') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAssignModal(exam);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Assign or delegate this examination to a faculty instructor"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{exam.assigned_teacher_id ? `Re-assign Evaluator` : 'Assign to Teacher'}</span>
                      </button>
                    )}
                    {exam.assigned_teacher_id === user?.id && (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                        ⭐ Delegated to You by Admin
                      </span>
                    )}
                  </div>

                  {/* Setup Incomplete Alert Banner */}
                  {isSetupIncomplete && (
                    isWebAnswersReady ? (
                      <div className="mt-3.5 p-3.5 bg-cyan-50/90 border border-cyan-200/90 rounded-xl text-xs text-cyan-950 flex items-start gap-2.5 shadow-xs">
                        <Sparkles className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold text-cyan-900">
                            Web Searched Answer Ready to Review
                          </div>
                          <div className="text-[11px] text-cyan-800/90 leading-relaxed">
                            Question paper is uploaded and {exam.total_questions > 0 ? `${exam.total_questions} questions are` : 'questions are'} configured. AI web-searched reference answers and mark rubrics are generated and ready for your review before student grading begins.
                          </div>
                        </div>
                      </div>
                    ) : isRubricRequired ? (
                      <div className="mt-3.5 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold">
                            Setup Incomplete: Rubric Not Uploaded
                          </div>
                          <div className="text-[11px] text-amber-800/90 leading-relaxed">
                            Questions are configured, but the evaluation rubric or lecture notes document has not been uploaded yet. Please upload the rubric before student grading can begin.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3.5 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 shadow-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <div className="font-bold">
                            {isWebSearch ? "Setup Incomplete: Question Paper Required" : "Setup Incomplete: Question Paper & Rubric Required"}
                          </div>
                          <div className="text-[11px] text-amber-800/90 leading-relaxed">
                            {isWebSearch 
                              ? "This exam was saved without uploading the Question Paper. Please upload the question paper so reference answers can be synthesized via web search."
                              : "This exam was saved without uploading the Question Paper. Please upload the question paper and rubric document before submitting student scripts."}
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Total Marks</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{exam.total_marks}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Pass Marks</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{exam.pass_marks}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Questions</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{exam.total_questions}</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
                      <div className="text-[10px] uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">Submissions</div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{exam.total_submissions}</div>
                    </div>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  {isSetupIncomplete ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          if (onResumeExam) {
                            onResumeExam(exam.id);
                          } else {
                            setSelectedExamId(exam.id);
                            setView('wizard');
                          }
                        }}
                        className={`w-full py-3 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-[1.005] active:scale-[0.995] ${
                          isWebAnswersReady 
                            ? 'bg-cyan-700 hover:bg-cyan-800' 
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {isWebAnswersReady ? (
                          <>
                            <Globe className="w-4 h-4 text-cyan-200" />
                            <span>Review Web Search Answers (Step 3)</span>
                          </>
                        ) : isRubricRequired ? (
                          <>
                            <Upload className="w-4 h-4 text-white" />
                            <span>Upload Rubric & Marking Scheme (Step 3)</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-white" />
                            <span>{isWebSearch ? "Upload Question Paper (Step 2)" : "Upload Question Paper & Rubric (Step 2)"}</span>
                          </>
                        )}
                        <ArrowRight className="w-4 h-4 ml-auto" />
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (onResumeExam) {
                              onResumeExam(exam.id);
                            } else {
                              setSelectedExamId(exam.id);
                              setView('wizard');
                            }
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title={isWebAnswersReady ? "Review and approve web search answers first" : "Complete setup first"}
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isWebAnswersReady ? "Submissions (Review Answers First)" : "Submissions (Setup First)"}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onResumeExam) {
                              onResumeExam(exam.id);
                            } else {
                              setSelectedExamId(exam.id);
                              setView('wizard');
                            }
                          }}
                          className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          title={isWebAnswersReady ? "Review and approve web search answers first" : "Complete setup first"}
                        >
                          <Play className="w-3.5 h-3.5 text-slate-400" />
                          <span>AI Grading (Locked)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Primary Next Action Highlight Button */}
                      {(() => {
                        const isGradedOrReview = ['graded', 'in_review'].includes(exam.status);
                        const isFinalized = exam.status === 'finalized';
                        const hasSubmissions = (exam.total_submissions || 0) > 0;
                        const needsGrading = hasSubmissions && (exam.graded_count || 0) === 0;

                        if (isFinalized) {
                          return (
                            <button
                              onClick={() => {
                                setSelectedExamId(exam.id);
                                setView('reports');
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                              <FileSpreadsheet className="w-4 h-4 text-white" />
                              <span>View Finalized Reports & Marksheet</span>
                              <ArrowRight className="w-4 h-4 ml-auto" />
                            </button>
                          );
                        } else if (isGradedOrReview) {
                          return (
                            <button
                              onClick={() => {
                                setSelectedExamId(exam.id);
                                setView('review');
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
                            >
                              <ShieldCheck className="w-4 h-4 text-white" />
                              <span>Open Review Matrix & Overrides</span>
                              <ArrowRight className="w-4 h-4 ml-auto" />
                            </button>
                          );
                        } else if (needsGrading) {
                          return (
                            <button
                              onClick={() => {
                                setSelectedExamId(exam.id);
                                setView('grading');
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer hover:shadow-md"
                            >
                              <Play className="w-4 h-4 text-white fill-current" />
                              <span>Run AI Grading Engine ({exam.total_submissions} Scripts Ready)</span>
                              <ArrowRight className="w-4 h-4 ml-auto" />
                            </button>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => {
                                setSelectedExamId(exam.id);
                                setView('submissions');
                              }}
                              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
                            >
                              <Upload className="w-4 h-4 text-white" />
                              <span>Upload Student Answer Sheets</span>
                              <ArrowRight className="w-4 h-4 ml-auto" />
                            </button>
                          );
                        }
                      })()}

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setView('submissions');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:border-slate-300 dark:hover:border-slate-600"
                        >
                          <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                          <span>Submissions & Scripts</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setView('grading');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs hover:border-indigo-300"
                        >
                          <Play className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>AI Grading Engine</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setView('review');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>Review Matrix</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setView('analytics');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                        >
                          <BarChart3 className="w-3.5 h-3.5 text-violet-500" />
                          <span>Analytics</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedExamId(exam.id);
                            setView('reports');
                          }}
                          className="py-2 px-2.5 rounded-xl bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center justify-center gap-1 transition-all cursor-pointer hover:border-slate-300"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Reports</span>
                        </button>
                      </div>

                      {exam.status === 'finalized' && (
                        <a
                          href={reportsApi.getExcelUrl(exam.id)}
                          download
                          className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs hover:border-emerald-300"
                          title="Download official XLSX marksheet with teacher, subject, student USNs and marks"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <span>Download Marksheet (.xlsx)</span>
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>
              );
            })}
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
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-200 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-900 dark:text-rose-100">This action cannot be undone.</p>
              <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                Deleting <span className="font-semibold text-rose-900 dark:text-rose-100">"{examToDelete?.title}"</span> will permanently remove the exam configuration, questions, rubrics, and all {examToDelete?.total_submissions || 0} student evaluation records.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setExamToDelete(null);
                setDeleteError(null);
              }}
              className="px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
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

      {/* Teacher Assignment Modal (College Admin Only) */}
      {assigningExam && (
        <Modal
          isOpen={Boolean(assigningExam)}
          onClose={() => setAssigningExam(null)}
          title="Delegate Exam Evaluation to Faculty"
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50 rounded-2xl space-y-1.5 text-xs text-purple-950 dark:text-purple-200">
              <div className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{assigningExam.title}</div>
              <div className="text-purple-800 dark:text-purple-300 font-mono text-[11px]">Exam Code: {assigningExam.exam_code} • {assigningExam.subject}</div>
              {assigningExam.created_by_name && (
                <div className="text-slate-600 dark:text-slate-400">Created by: <b className="text-slate-900 dark:text-slate-200">{assigningExam.created_by_name}</b></div>
              )}
              {assigningExam.assigned_teacher_name && (
                <div className="text-purple-700 dark:text-purple-300">Currently Assigned to: <b>{assigningExam.assigned_teacher_name}</b></div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Select Course Teacher / Evaluator *
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 font-medium"
              >
                <option value="">-- No Teacher (Unassigned) --</option>
                {teachersList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.email}) [{t.role}]
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                The designated faculty member will gain access to this exam workspace, upload answer sheets, run AI evaluations, and review marks.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningExam(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignment}
                disabled={isAssigning}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isAssigning ? 'Saving Assignment...' : 'Confirm Delegation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
