import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle, 
  History, Sparkles, Lock, BarChart3, FileSpreadsheet,
  Globe, ShieldAlert, Eye, Edit3, CheckCircle2, Download,
  Search, X, Filter, Users, TrendingUp, Award, Check
} from 'lucide-react';
import { reviewApi, reportsApi } from '../api/client';
import { Badge, OCRBadge, GradingModeBadge } from '../components/Badge';
import { ScoreInspector } from '../components/ScoreInspector';
import { Modal } from '../components/Modal';

export const ReviewMatrix = ({ examId, setView }) => {
  const [matrixData, setMatrixData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'audit'
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('all'); // 'all', 'passed', 'failed', 'overrides', 'contradictions'
  
  // Score Inspector State
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedScoreData, setSelectedScoreData] = useState(null);

  // Finalize Confirmation & Success Modals
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizedSuccessOpen, setFinalizedSuccessOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const [matRes, auditRes] = await Promise.all([
        reviewApi.getMatrix(examId),
        reviewApi.getAuditLogs(examId)
      ]);
      setMatrixData(matRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Error loading review matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchMatrix();
  }, [examId]);

  const handleCellClick = (student, question) => {
    const scoreData = student.question_scores[question.id];
    if (!scoreData) return;
    setSelectedStudent(student);
    setSelectedQuestion(question);
    setSelectedScoreData(scoreData);
    setInspectorOpen(true);
  };

  const handleFinalizeExam = async () => {
    setFinalizing(true);
    try {
      await reviewApi.finalize(examId, { notes: 'Exam verified and finalized by course instructor.' });
      setFinalizeModalOpen(false);
      setFinalizedSuccessOpen(true);
      await fetchMatrix();
    } catch (err) {
      alert('Error finalizing exam: ' + (err.response?.data?.detail || err.message));
    } finally {
      setFinalizing(false);
    }
  };

  if (loading && !matrixData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <div className="text-slate-600 font-medium text-sm">Loading Teacher Review Matrix...</div>
      </div>
    );
  }

  const isFinalized = matrixData?.status === 'finalized';

  const students = matrixData?.students || [];
  const totalStudents = students.length;
  const passedStudents = students.filter(s => s.passed);
  const failedStudents = students.filter(s => !s.passed);
  const passRate = totalStudents > 0 ? Math.round((passedStudents.length / totalStudents) * 100) : 0;
  
  const avgScore = totalStudents > 0 
    ? (students.reduce((acc, s) => acc + (s.total_marks || 0), 0) / totalStudents).toFixed(1)
    : 0;

  const highestScore = totalStudents > 0
    ? Math.max(...students.map(s => s.total_marks || 0))
    : 0;

  let totalOverrides = 0;
  const studentsWithOverrides = students.filter(s => {
    let has = false;
    Object.values(s.question_scores || {}).forEach(score => {
      if (score.is_overridden) {
        has = true;
        totalOverrides++;
      }
    });
    return has;
  });

  const studentsWithContra = students.filter(s => 
    Object.values(s.question_scores || {}).some(score => score.has_contradiction)
  );

  const filteredStudents = students.filter(s => {
    const q = studentSearch.toLowerCase().trim();
    const match = !q || 
      (s.student_roll && s.student_roll.toLowerCase().includes(q)) ||
      (s.student_name && s.student_name.toLowerCase().includes(q)) ||
      (s.student_email && s.student_email.toLowerCase().includes(q));

    if (!match) return false;

    if (studentFilter === 'passed') return s.passed;
    if (studentFilter === 'failed') return !s.passed;
    if (studentFilter === 'overrides') return Object.values(s.question_scores || {}).some(sc => sc.is_overridden);
    if (studentFilter === 'contradictions') return Object.values(s.question_scores || {}).some(sc => sc.has_contradiction);

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setView('analytics')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Class Analytics</span>
          </button>

          <button
            onClick={() => setView('reports')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Reports & Dispatch</span>
          </button>

          {!isFinalized ? (
            <button
              onClick={() => setFinalizeModalOpen(true)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Finalize Marks</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="success" size="lg">
                <Lock className="w-3.5 h-3.5 mr-1" /> Finalized & Published
              </Badge>
              <a
                href={reportsApi.getExcelUrl(examId)}
                download
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Download official XLSX marksheet with teacher name, subject, student USNs and marks"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Download Marksheet (.xlsx)</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* FINALIZED EXAM MARKSHEET BANNER */}
      {isFinalized && (
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-500/30 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Assessment Finalized & Published
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {matrixData?.students?.length || 0} Students Evaluated
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                Official Results Marksheet Ready for Download (.xlsx)
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Contains institutional top details: <b>Subject</b> ({matrixData?.subject}), <b>Exam Type & Title</b> ({matrixData?.exam_code}), <b>Total Marks</b> ({matrixData?.total_exam_marks}M), <b>Teacher / Evaluator</b>, and rows of all student <b>USNs, Names, Question Scores</b>, and final pass/fail results.
              </p>
            </div>
          </div>

          <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
            <a
              href={reportsApi.getExcelUrl(examId)}
              download
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-950/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              <Download className="w-4 h-4 text-white" />
              <span>Download Official Marksheet (.xlsx)</span>
            </a>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <GradingModeBadge mode={matrixData?.grading_mode} />
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded font-medium">
              {matrixData?.exam_code}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">
            Teacher Grade Review Matrix & Overrides
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Inspect individual question evaluations, verify evidence, override marks with mandatory rationale, and maintain an immutable audit trail.
          </p>
        </div>

        {/* Matrix Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Review Grid ({matrixData?.students?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Ledger ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Class Enrolled</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{totalStudents}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Students Evaluated</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Class Average</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{avgScore}</div>
          <div className="text-[10px] text-indigo-600/70 dark:text-indigo-500/70 mt-0.5">out of {matrixData?.total_exam_marks || 50}M</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pass Rate</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{passRate}%</div>
          <div className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">{passedStudents.length} of {totalStudents} passed</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Highest Score</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{highestScore}</div>
          <div className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">Max {matrixData?.total_exam_marks || 50}M</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Active Overrides</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{totalOverrides}</div>
          <div className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">across {studentsWithOverrides.length} students</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Contradictions</div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{studentsWithContra.length}</div>
          <div className="text-[10px] text-rose-600/70 dark:text-rose-500/70 mt-0.5">Alerts flagged by AI</div>
        </div>
      </div>

      {/* TAB 1: REVIEW MATRIX GRID */}
      {activeTab === 'matrix' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-800">
            <span>Tip: Click on any score cell to open the detailed Score Inspector & override marks.</span>
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Overridden Mark
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Contradiction Alert
              </span>
              <span className="flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Web Evidence
              </span>
            </div>
          </div>

          {/* Search & Quick Filter Controls */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by student roll, name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs flex-wrap">
              <button
                type="button"
                onClick={() => setStudentFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  studentFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({totalStudents})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter('passed')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  studentFilter === 'passed'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Passed ({passedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter('failed')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  studentFilter === 'failed'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Failed ({failedStudents.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter('overrides')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  studentFilter === 'overrides'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Overrides ({studentsWithOverrides.length})
              </button>
              <button
                type="button"
                onClick={() => setStudentFilter('contradictions')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  studentFilter === 'contradictions'
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Contradictions ({studentsWithContra.length})
              </button>
            </div>
          </div>

          {/* Module Choice Policy Banner */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-900 dark:text-indigo-200 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 font-bold rounded-md text-[11px] uppercase tracking-wide border border-indigo-200 dark:border-indigo-800">
                Module Choice Rule
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Students answer 1 question per module (e.g. Q1 a,b,c OR Q2 a,b,c). Each module carries <b>max 20 marks</b>. Best option is awarded without exceeding the 20-mark module cap.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-xs">
              Exam Cap: {matrixData?.total_exam_marks || 50} Marks
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4 w-32">USN / Roll No</th>
                  <th className="py-3 px-4 w-52">Student Name</th>
                  {matrixData?.questions?.map((q) => (
                    <th key={q.id} className="py-3 px-3 text-center min-w-[75px]">
                      {q.module_name && (
                        <div className="text-[9px] uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold mb-0.5">
                          {q.module_name}
                        </div>
                      )}
                      <div className="font-bold text-slate-900 dark:text-slate-100">{q.question_number}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Max {q.max_marks}M</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center w-28">Total</th>
                  <th className="py-3 px-4 text-center w-24">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={(matrixData?.questions?.length || 0) + 4} className="py-12 text-center text-slate-400 dark:text-slate-500">
                      <div className="space-y-2">
                        <p>No student records match the active filter.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setStudentSearch('');
                            setStudentFilter('all');
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    return (
                      <tr key={student.submission_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                          <div>{student.student_roll}</div>
                          {student.student_email && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono font-normal truncate max-w-[140px]" title={student.student_email}>
                              {student.student_email}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{student.student_name}</div>
                          {student.module_breakdown && (
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {Object.entries(student.module_breakdown).map(([modName, modInfo]) => (
                                <span
                                  key={modName}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono"
                                  title={`${modInfo.choice_group}: Option ${modInfo.selected_option} scored ${modInfo.awarded_marks}/${modInfo.module_max_marks}M`}
                                >
                                  {modName}: <b className="text-emerald-700 dark:text-emerald-400 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Question Cells */}
                        {matrixData?.questions?.map((q) => {
                          const score = student.question_scores[q.id];
                          if (!score || score.evaluation_id === null) {
                            return (
                              <td key={q.id} className="py-3.5 px-4 text-center text-slate-400 dark:text-slate-600 font-mono">
                                -
                              </td>
                            );
                          }

                          const isAttempted = Boolean(score.student_answer && score.student_answer.trim().length > 0);
                          const hasContra = score.has_contradiction;
                          const hasWeb = score.has_web_evidence;
                          const isOverridden = score.is_overridden;

                          return (
                            <td 
                              key={q.id} 
                              onClick={() => handleCellClick(student, q)}
                              className="py-3.5 px-3 text-center cursor-pointer matrix-cell"
                            >
                              <div className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 transition-all ${
                                isOverridden 
                                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold shadow-xs'
                                  : !isAttempted
                                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                                  : score.final_marks > 0
                                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400 hover:border-emerald-400 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 font-bold shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 shadow-xs'
                              }`}>
                                <span className="font-mono text-xs">
                                  {isAttempted ? (
                                    score.final_marks
                                  ) : (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono" title="Optional choice skipped by student">
                                      0
                                    </span>
                                  )}
                                </span>
                                {isOverridden && (
                                  <Edit3 className="w-3 h-3 text-amber-600 dark:text-amber-400" title="Teacher Overridden" />
                                )}
                                {hasContra && (
                                  <ShieldAlert className="w-3 h-3 text-rose-600 dark:text-rose-400" title="Contradiction Flagged" />
                                )}
                                {hasWeb && (
                                  <Globe className="w-3 h-3 text-cyan-600 dark:text-cyan-400" title="Web Factual Evidence" />
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total & Result */}
                        <td className="py-3.5 px-4 text-center font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                          {student.total_marks}
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                            {student.percentage}%
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge variant={student.passed ? 'success' : 'danger'} size="sm">
                            {student.passed ? 'PASS' : 'FAIL'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Immutable Audit History Ledger ({auditLogs.length})</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">All modifications are permanently recorded with cryptographic assurance</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No manual overrides or modifications logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        {log.action}
                      </Badge>
                      <span className="font-bold text-slate-900 dark:text-slate-100">{log.user_email}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    <span>Old Value: <b className="text-slate-500 dark:text-slate-400">{log.old_value}</b></span>
                    <span>→</span>
                    <span>New Value: <b className="text-emerald-700 dark:text-emerald-400 font-bold">{log.new_value}</b></span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 italic">
                    <span className="font-bold text-slate-800 dark:text-slate-200 not-italic">Justification Reason: </span>
                    "{log.reason}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCORE INSPECTOR DRAWER */}
      <ScoreInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        question={selectedQuestion}
        student={selectedStudent}
        scoreData={selectedScoreData}
        gradingMode={matrixData?.grading_mode}
        onOverrideSaved={async () => {
          setInspectorOpen(false);
          await fetchMatrix();
        }}
      />

      {/* FINALIZE CONFIRMATION MODAL */}
      <Modal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        title="Approve & Finalize All Exam Results"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Finalizing marks confirms that you have reviewed all AI evaluations and mark overrides. This will lock the assessment, enable student portal lookups, and allow Excel/PDF report dispatch.
          </p>

          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
            <b>Audit Assurance:</b> A permanent sign-off entry will be written to the audit log.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setFinalizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalizeExam}
              disabled={finalizing}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{finalizing ? 'Finalizing...' : 'Confirm Final Approval'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* FINALIZATION SUCCESS & EXCEL DOWNLOAD MODAL */}
      <Modal
        isOpen={finalizedSuccessOpen}
        onClose={() => setFinalizedSuccessOpen(false)}
        title="Exam Results Approved & Finalized"
        maxWidth="max-w-lg"
      >
        <div className="space-y-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-0.5 text-left">
              <h4 className="font-bold text-emerald-950 dark:text-emerald-200 text-sm">
                Exam Finalized & Published to Student Portals
              </h4>
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                All marks, overrides, and audit trails have been permanently locked. Students can now check their scores using their USN.
              </p>
            </div>
          </div>

          {/* Institutional Highlights Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-2.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-700 pb-1">
              Official Marksheet Header Details
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Subject:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{matrixData?.subject}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Exam Code & Title:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{matrixData?.exam_code}</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total Exam Marks:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{matrixData?.total_exam_marks} Marks</span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Teacher / Evaluator:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {matrixData?.assigned_teacher_name || matrixData?.created_by_name || 'Course Faculty'}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action: Download XLSX Marksheet */}
          <div className="space-y-2 pt-2">
            <a
              href={reportsApi.getExcelUrl(examId)}
              download
              onClick={() => {
                setTimeout(() => setFinalizedSuccessOpen(false), 1500);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-emerald-950/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-center"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
              <span>Download Official Marksheet (.xlsx)</span>
            </a>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFinalizedSuccessOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Continue to Review Grid
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinalizedSuccessOpen(false);
                  setView('reports');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                Go to Reports & Dispatch →
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
