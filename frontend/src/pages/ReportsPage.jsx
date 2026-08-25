import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, FileSpreadsheet, FileText, Mail, Send, 
  CheckCircle2, Download, ExternalLink, RefreshCw, Eye, Sparkles
} from 'lucide-react';
import { examsApi, submissionsApi, reportsApi } from '../api/client';
import { Badge } from '../components/Badge';

export const ReportsPage = ({ examId, setView }) => {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading && !exam) {
    return <div className="p-12 text-center text-slate-400">Loading Reports & Dispatch...</div>;
  }

  const excelDownloadUrl = reportsApi.getExcelUrl(examId);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('dashboard')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('review')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Review Matrix
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-100">
          Reports, Exports & Student Dispatch
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {exam.title} ({exam.exam_code}) • Download styled multi-sheet Excel marksheet, individual PDF scorecards, or dispatch via email.
        </p>
      </div>

      {/* Main Export Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Sheet Excel Export Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              Multi-Sheet Excel Marksheet (.xlsx)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Generates an official multi-tab workbook with:
              <br />• <b>Master Marksheet:</b> Question-by-question breakdown, total scores, %, and pass/fail statuses.
              <br />• <b>Class Analytics:</b> Mean, median, standard deviation, and grade distribution.
              <br />• <b>Item Analysis:</b> Question discrimination index and success rates.
            </p>
          </div>

          <a
            href={excelDownloadUrl}
            download
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer text-center"
          >
            <Download className="w-4 h-4" /> Download Official Excel Marksheet (.xlsx)
          </a>
        </div>

        {/* Email Dispatch & Verification Card */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">
              Email Dispatch & Teacher Verification Preview
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Send a test report preview to yourself first, then bulk dispatch individual scorecards to all enrolled students.
            </p>
          </div>

          {/* Test Email Form */}
          <form onSubmit={handleSendTestEmail} className="flex gap-2">
            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              placeholder="instructor@university.edu"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={sendingTestEmail}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {sendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Test Preview
            </button>
          </form>

          {testEmailResult && (
            <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
              <CheckCircle2 className="w-4 h-4 text-indigo-400 inline mr-1" />
              {testEmailResult.message}
            </div>
          )}

          {/* Bulk Dispatch Button */}
          <button
            onClick={handleDispatchBulk}
            disabled={dispatchingBulk}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            {dispatchingBulk ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {dispatchingBulk ? 'Dispatching Results...' : `Bulk Dispatch to All ${submissions.length} Students`}
          </button>
        </div>
      </div>

      {/* Bulk Dispatch Live Logs */}
      {bulkDispatchResult && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            {bulkDispatchResult.message}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono">
            {bulkDispatchResult.logs?.map((l, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                <span>{l.student_roll} - {l.student_name} ({l.recipient_email})</span>
                <Badge variant="success" size="sm">Delivered ({l.score})</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Student PDF Download Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Individual Student Scorecards & PDF Reports ({submissions.length})
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4 text-right">Official PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-200">
                    {sub.student_roll}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-300">
                    {sub.student_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {sub.student_email}
                  </td>
                  <td className="py-3 px-4 text-center font-bold font-mono text-slate-100">
                    {sub.total_awarded_marks} / {exam.total_marks}
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
                      className="px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
