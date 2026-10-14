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
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <div className="text-slate-600 font-medium text-sm">Loading Reports & Dispatch...</div>
      </div>
    );
  }

  const excelDownloadUrl = reportsApi.getExcelUrl(examId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView('review')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            Review Matrix
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Reports, Exports & Student Dispatch
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {exam.title} ({exam.exam_code}) • Download styled multi-sheet Excel marksheet, individual PDF scorecards, or dispatch via email.
        </p>
      </div>

      {/* Main Export Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Sheet Excel Export Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Multi-Sheet Excel Marksheet (.xlsx)
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Generates an official multi-tab workbook with:
              <br /><span className="text-emerald-700 font-semibold">• Master Marksheet:</span> Question-by-question breakdown, total scores, %, and pass/fail statuses.
              <br /><span className="text-indigo-700 font-semibold">• Class Analytics:</span> Mean, median, standard deviation, and grade distribution.
              <br /><span className="text-purple-700 font-semibold">• Item Analysis:</span> Question discrimination index and success rates.
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-5">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Email Dispatch & Teacher Verification Preview
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
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
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
              required
            />
            <button
              type="submit"
              disabled={sendingTestEmail}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {sendingTestEmail ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Test Preview</span>
            </button>
          </form>

          {testEmailResult && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
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
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{bulkDispatchResult.message}</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
            {bulkDispatchResult.logs?.map((l, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-slate-700">
                <span>{l.student_roll} - {l.student_name} ({l.recipient_email})</span>
                <Badge variant="success" size="sm">Delivered ({l.score})</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual Student PDF Download Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" />
          <span>Individual Student Scorecards & PDF Reports ({submissions.length})</span>
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4 text-right">Official PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {sub.student_roll}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {sub.student_name}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {sub.student_email}
                  </td>
                  <td className="py-3 px-4 text-center font-bold font-mono text-slate-900">
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
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-indigo-600" /> <span>Download PDF</span>
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
