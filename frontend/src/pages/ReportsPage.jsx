import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileSpreadsheet, FileText, Mail, Send, 
  CheckCircle2, Download, ExternalLink, RefreshCw, Eye, Sparkles, Globe,
  Search, X, Copy, Check
} from 'lucide-react';
import { examsApi, submissionsApi, reportsApi } from '../api/client';
import { Badge } from '../components/Badge';

export const ReportsPage = ({ examId, setView }) => {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Email States
  const [teacherEmail, setTeacherEmail] = useState('instructor@university.edu');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);

  const [dispatchingBulk, setDispatchingBulk] = useState(false);
  const [bulkDispatchResult, setBulkDispatchResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exRes, subRes] = await Promise.all([
        examsApi.get(examId),
        submissionsApi.list(examId)
      ]);
      setExam(exRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchData();
  }, [examId]);

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setSendingTestEmail(true);
    try {
      const res = await reportsApi.sendTestEmail(examId, teacherEmail);
      setTestEmailResult(res.data);
    } catch (err) {
      alert('Failed to send test email: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleDispatchBulk = async () => {
    if (!window.confirm('Dispatch finalized official results to all enrolled students?')) return;
    setDispatchingBulk(true);
    try {
      const res = await reportsApi.dispatchBulk(examId);
      setBulkDispatchResult(res.data);
    } catch (err) {
      alert('Bulk dispatch failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDispatchingBulk(false);
    }
  };

  const copyPortalLink = () => {
    const url = `${window.location.origin}/?exam=${exam?.exam_code}&tab=lookup`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading && !exam) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">Loading Reports & Dispatch...</div>
      </div>
    );
  }

  const excelDownloadUrl = reportsApi.getExcelUrl(examId);

  const filteredSubmissions = submissions.filter(sub => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (sub.student_roll && sub.student_roll.toLowerCase().includes(q)) ||
      (sub.student_name && sub.student_name.toLowerCase().includes(q)) ||
      (sub.student_email && sub.student_email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView('review')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            Review Matrix
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Reports, Exports & Student Dispatch
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {exam.title} ({exam.exam_code}) • Download styled multi-sheet Excel marksheet, individual PDF scorecards, or dispatch via email.
          </p>
        </div>

        <button
          onClick={copyPortalLink}
          className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
        >
          {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
          <span>{copiedLink ? 'Portal Link Copied!' : 'Copy Student Portal Link'}</span>
        </button>
      </div>

      {/* Main Export Grid */}
      <div className={`grid grid-cols-1 ${exam?.grading_mode === 'rubric_web_validated' ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6`}>
        {/* Web Search Answers PDF Card (Option 2) */}
        {exam?.grading_mode === 'rubric_web_validated' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-cyan-200/90 dark:border-cyan-900/50 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 flex items-center justify-center border border-cyan-100 dark:border-cyan-800">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Web Search Answers (.pdf)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Official reference guide with:
                <br /><span className="text-cyan-700 dark:text-cyan-400 font-semibold">• Model Solutions:</span> Calibrated to question marks.
                <br /><span className="text-emerald-700 dark:text-emerald-400 font-semibold">• Proportional Rubrics:</span> Weighted concept criteria.
                <br /><span className="text-indigo-700 dark:text-indigo-400 font-semibold">• Citations:</span> Wikipedia & academic web evidence.
              </p>
            </div>

            <a
              href={reportsApi.getWebAnswersPdfUrl(exam.id)}
              download
              className="w-full py-3.5 px-4 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-center"
            >
              <Download className="w-4 h-4" /> <span>Download Answers PDF</span>
            </a>
          </div>
        )}

        {/* Multi-Sheet Excel Export Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Multi-Sheet Excel Marksheet (.xlsx)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Generates an official multi-tab workbook with:
              <br /><span className="text-emerald-700 dark:text-emerald-400 font-semibold">• Master Marksheet:</span> Question-by-question breakdown, total scores, %, and pass/fail statuses.
              <br /><span className="text-indigo-700 dark:text-indigo-400 font-semibold">• Class Analytics:</span> Mean, median, standard deviation, and grade distribution.
              <br /><span className="text-purple-700 dark:text-purple-400 font-semibold">• Item Analysis:</span> Question discrimination index and success rates.
            </p>
          </div>

          <a
            href={excelDownloadUrl}
            download
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-center"
          >
            <Download className="w-4 h-4" /> <span>Download Official Excel Marksheet (.xlsx)</span>
          </a>
        </div>

        {/* Email Dispatch & Verification Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-800">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Email Dispatch & Teacher Verification Preview
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Send a test report preview to yourself first, then bulk dispatch individual scorecards to all enrolled students.
            </p>
          </div>

          {/* Test Email Form */}
          <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              placeholder="instructor@university.edu"
              className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
              required
            />
            <button
              type="submit"
              disabled={sendingTestEmail}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {sendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Test Preview</span>
            </button>
          </form>

          {testEmailResult && (
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{testEmailResult.message}</span>
            </div>
          )}

          {/* Bulk Dispatch Button */}
          <button
            onClick={handleDispatchBulk}
            disabled={dispatchingBulk}
            className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {dispatchingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{dispatchingBulk ? 'Dispatching Results...' : `Bulk Dispatch to All ${submissions.length} Students`}</span>
          </button>
        </div>
      </div>

      {/* Bulk Dispatch Live Logs */}
      {bulkDispatchResult && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>{bulkDispatchResult.message}</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
            {bulkDispatchResult.logs?.map((l, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>{l.student_roll} - {l.student_name} ({l.recipient_email})</span>
                <Badge variant="success" size="sm">Delivered ({l.score})</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Student PDF Download Table with Search */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Individual Student Scorecards & PDF Reports ({filteredSubmissions.length})</span>
          </h3>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by roll, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4 text-right">Official PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No student records found matching "{searchQuery}".
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {sub.student_roll}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {sub.student_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {sub.student_email}
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-slate-100">
                      {sub.total_awarded_marks} / {exam.total_marks || 50}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={sub.passed ? 'success' : 'danger'} size="sm">
                        {sub.passed ? 'PASS' : 'FAIL'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={reportsApi.getPdfUrl(sub.id)}
                        download
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> <span>Download PDF</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
