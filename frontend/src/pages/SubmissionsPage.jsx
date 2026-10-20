import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Users, ShieldAlert, CheckCircle, 
  FileText, Edit3, Eye, Copy, Check, Sparkles, AlertTriangle, AlertCircle,
  Camera, RefreshCw, Search, X, Filter, CheckCircle2, ChevronRight, CheckCheck
} from 'lucide-react';
import { examsApi, submissionsApi } from '../api/client';
import { Badge, OCRBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const SubmissionsPage = ({ examId, setView, onResumeExam }) => {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'flagged', 'ready', 'graded'
  
  // OCR Verification Modal State
  const [selectedSub, setSelectedSub] = useState(null);
  const [correctedText, setCorrectedText] = useState('');
  const [selectedRoll, setSelectedRoll] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [extractingWithLens, setExtractingWithLens] = useState(false);
  const [extractedAnswers, setExtractedAnswers] = useState([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [modalTab, setModalTab] = useState('questions'); // 'questions' or 'raw'
  
  // Student Portal Link Copied State
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [examRes, subRes] = await Promise.all([
        examsApi.get(examId),
        submissionsApi.list(examId)
      ]);
      setExam(examRes.data);
      setSubmissions(subRes.data);
    } catch (err) {
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchData();
  }, [examId]);

  // Bulk Upload Handler
  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      await submissionsApi.bulkUpload(examId, formData);
      await fetchData();
    } catch (err) {
      alert('Error uploading submissions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  // Open OCR Verification Modal
  const handleOpenOcrModal = async (sub) => {
    setSelectedSub(sub);
    setCorrectedText(sub.extracted_text || '');
    setSelectedRoll(sub.student_roll || '');
    setSelectedName(sub.student_name || '');
    setModalTab('questions');
    setLoadingAnswers(true);
    setExtractedAnswers([]);

    // Fetch fresh detail with full extracted text
    try {
      const [res, ansRes] = await Promise.all([
        submissionsApi.get(sub.id),
        submissionsApi.getExtractedAnswers(examId, sub.id).catch(() => ({ data: { detected_answers: [] } }))
      ]);
      if (res.data) {
        setSelectedSub(res.data);
        setCorrectedText(res.data.extracted_text || sub.extracted_text || '');
        setSelectedRoll(res.data.student_roll || sub.student_roll || '');
        setSelectedName(res.data.student_name || sub.student_name || '');
      }
      if (ansRes.data?.detected_answers && ansRes.data.detected_answers.length > 0) {
        setExtractedAnswers(ansRes.data.detected_answers);
      }
    } catch (err) {
      console.warn('Could not load fresh submission detail:', err);
    } finally {
      setLoadingAnswers(false);
    }
  };

  // Trigger Google Lens Vision AI extraction on demand
  const handleExtractWithLens = async () => {
    if (!selectedSub) return;
    setExtractingWithLens(true);
    try {
      const res = await submissionsApi.extractWithLens(examId, selectedSub.id);
      if (res.data && res.data.extracted_text) {
        setSelectedSub(prev => ({
          ...prev,
          extracted_text: res.data.extracted_text,
          student_roll: res.data.student_roll || prev.student_roll,
          student_name: res.data.student_name || prev.student_name,
          ocr_confidence: res.data.ocr_confidence,
          is_ocr_verified: true,
          status: res.data.status
        }));
        setCorrectedText(res.data.extracted_text);
        if (res.data.student_roll) setSelectedRoll(res.data.student_roll);
        if (res.data.student_name) setSelectedName(res.data.student_name);
        const ansRes = await submissionsApi.getExtractedAnswers(examId, selectedSub.id).catch(() => ({ data: { detected_answers: [] } }));
        if (ansRes.data?.detected_answers) {
          setExtractedAnswers(ansRes.data.detected_answers);
        }
        await fetchData();
      }
    } catch (err) {
      alert('Google Lens Vision extraction failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setExtractingWithLens(false);
    }
  };

  // Save Text & Credentials Correction
  const handleSaveCorrection = async () => {
    if (!selectedSub) return;
    setSavingCorrection(true);
    try {
      await submissionsApi.correctOCRText({
        submission_id: selectedSub.id,
        corrected_text: correctedText,
        student_roll: selectedRoll.trim(),
        student_name: selectedName.trim(),
        reason: 'Teacher manual side-by-side text & credentials review'
      });
      setSelectedSub(null);
      await fetchData();
    } catch (err) {
      alert('Failed to update submission: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSavingCorrection(false);
    }
  };

  const copyPortalLink = () => {
    const url = `${window.location.origin}/?exam=${exam?.exam_code}&tab=submit`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading && !exam) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <div className="text-slate-600 font-medium text-sm">Loading submissions & scripts...</div>
      </div>
    );
  }

  const flaggedCount = submissions.filter(s => (s.ocr_confidence < 0.7 && !s.is_ocr_verified) || s.status === 'ocr_flagged').length;
  const gradedCount = submissions.filter(s => s.status === 'graded').length;
  const readyCount = submissions.filter(s => s.status !== 'graded').length;
  const highConfidenceCount = submissions.filter(s => (s.ocr_confidence >= 0.7 || s.is_ocr_verified)).length;

  const filteredSubmissions = submissions.filter(sub => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (sub.student_roll && sub.student_roll.toLowerCase().includes(q)) ||
      (sub.student_name && sub.student_name.toLowerCase().includes(q)) ||
      (sub.original_filename && sub.original_filename.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === 'flagged') {
      return (sub.ocr_confidence < 0.7 && !sub.is_ocr_verified) || sub.status === 'ocr_flagged';
    }
    if (statusFilter === 'ready') {
      return sub.status !== 'graded';
    }
    if (statusFilter === 'graded') {
      return sub.status === 'graded';
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('grading')}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Proceed to AI Grading Engine</span>
          </button>
        </div>
      </div>

      {/* Exam Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 px-2.5 py-0.5 rounded-md font-bold">
              {exam?.exam_code}
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{exam?.subject}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5 tracking-tight">{exam?.title}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ingestion & OCR Quality Gate Control • Teacher-in-the-Loop Verification
          </p>
        </div>

        {/* Share Link for Students */}
        <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs self-stretch md:self-auto">
          <div className="text-xs text-slate-600 dark:text-slate-300 pl-2 font-medium">
            Student Submission Link:
          </div>
          <button
            onClick={copyPortalLink}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Enrolled</div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{submissions.length}</div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Answer scripts</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">High Confidence</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{highConfidenceCount}</div>
          <div className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 mt-0.5">
            {submissions.length > 0 ? Math.round((highConfidenceCount / submissions.length) * 100) : 0}% passing OCR gate
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Needs Review</div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{flaggedCount}</div>
          <div className="text-[10px] text-amber-600/70 dark:text-amber-500/70 mt-0.5">Confidence &lt; 70% or flagged</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Graded by AI</div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{gradedCount}</div>
          <div className="text-[10px] text-indigo-600/70 dark:text-indigo-500/70 mt-0.5">{submissions.length - gradedCount} awaiting grading</div>
        </div>
      </div>

      {/* Warning banner if QP or Scheme is not yet configured */}
      {(() => {
        if (!exam) return null;
        const hasQP = Boolean(exam.has_question_paper) || 
                      (exam.total_questions && exam.total_questions > 0) || 
                      (exam.questions && exam.questions.length > 0) || 
                      Boolean(exam.question_paper_path) || 
                      Boolean(exam.question_paper_text);

        const hasScheme = Boolean(exam.has_evaluation_scheme) || 
                          Boolean(exam.marking_scheme_path) || 
                          Boolean(exam.marking_scheme_text) || 
                          Boolean(exam.notes_document_path) || 
                          Boolean(exam.notes_extracted_text) ||
                          (exam.questions && exam.questions.some(q => (q.model_answer && q.model_answer.trim().length > 0) || (q.rubric_items && q.rubric_items.length > 0)));

        if (hasQP && hasScheme) return null;

        const qCount = exam.total_questions || exam.questions?.length || 0;

        return (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-900/60 rounded-3xl p-6 shadow-sm space-y-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {!hasQP && !hasScheme && "⚠️ Question Paper & Evaluation Scheme Required First"}
                  {hasQP && !hasScheme && "⚠️ Evaluation Scheme Required First"}
                  {!hasQP && hasScheme && "⚠️ Question Paper Required First"}
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  {!hasQP && !hasScheme && `This exam (${exam.exam_code}) currently has no question paper or evaluation scheme uploaded. Student Blue Books cannot be evaluated by the AI grading engine without the questions and reference answer key.`}
                  {hasQP && !hasScheme && `This exam (${exam.exam_code}) currently has ${qCount} questions configured and no marking scheme uploaded. Student Blue Books cannot be evaluated by the AI grading engine without the reference answer key.`}
                  {!hasQP && hasScheme && `This exam (${exam.exam_code}) has an evaluation scheme configured, but questions have not been set up yet. Please upload the question paper.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (onResumeExam) {
                    onResumeExam(exam.id);
                  } else {
                    setView('wizard');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {!hasQP && !hasScheme && "Upload Question Paper & Evaluation Scheme"}
                  {hasQP && !hasScheme && "Upload Evaluation Scheme"}
                  {!hasQP && hasScheme && "Upload Question Paper"}
                </span>
              </button>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">or continue uploading scripts below</span>
            </div>
          </div>
        );
      })()}

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-8 sm:p-10 text-center bg-slate-50/60 dark:bg-slate-900/60 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all">
        <input
          type="file"
          id="bulk-sub-input"
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          onChange={handleBulkUpload}
          className="hidden"
          disabled={uploading}
        />
        <label htmlFor="bulk-sub-input" className="cursor-pointer space-y-3 block">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-800 shadow-xs">
            {uploading ? (
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          <div>
            <span className="text-base font-bold text-slate-800 dark:text-slate-200 block">
              {uploading ? 'Processing & Extracting OCR...' : 'Drag and drop or click to bulk upload student answer sheets'}
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports multiple PDFs, DOCX, TXT, and scanned image sheets simultaneously
            </p>
          </div>
        </label>
      </div>

      {/* Submissions Table with Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Enrolled Student Submissions ({filteredSubmissions.length}{filteredSubmissions.length !== submissions.length ? ` of ${submissions.length}` : ''})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Review OCR confidence, inspect extracted text, and verify student responses</p>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search USN, name, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
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

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('flagged')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === 'flagged'
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Needs Review ({flaggedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ready')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'ready'
                    ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Ready ({readyCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('graded')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  statusFilter === 'graded'
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Graded ({gradedCount})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">USN / Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4 text-center">OCR Confidence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    {submissions.length === 0 ? (
                      'No submissions uploaded yet. Use the upload box above to add student answer sheets.'
                    ) : (
                      <div className="space-y-2">
                        <p>No student submissions match your filter criteria.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                          }}
                          className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {sub.student_roll}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{sub.student_name}</div>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {sub.student_email}
                        </span>
                        {sub.module_scores && (() => {
                          try {
                            const mData = typeof sub.module_scores === 'string' ? JSON.parse(sub.module_scores) : sub.module_scores;
                            return (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {Object.entries(mData).map(([modName, modInfo]) => (
                                  <span key={modName} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono" title={`${modInfo.choice_group}: Option ${modInfo.selected_option}`}>
                                    {modName}: <b className="text-emerald-700 dark:text-emerald-400 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                                  </span>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                        {sub.original_filename}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <OCRBadge confidence={sub.ocr_confidence} isVerified={sub.is_ocr_verified} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sub.status === 'graded' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold text-xs bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Graded ({sub.total_awarded_marks} / {exam?.total_marks || 50}M)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-semibold text-xs bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Ready for AI
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenOcrModal(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Inspect / Edit Text</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Floating Quick Action Footer */}
        {submissions.length > 0 && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Showing {filteredSubmissions.length} of {submissions.length} student submission records
            </span>
            <button
              onClick={() => setView('grading')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs flex items-center gap-2 shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Next Step: Run AI Grading Engine</span>
              <ChevronRight className="w-4 h-4 text-indigo-200" />
            </button>
          </div>
        )}
      </div>

      {/* SIDE-BY-SIDE OCR VERIFICATION MODAL */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={`Text Inspector & Editor: ${selectedSub?.student_name} (${selectedSub?.student_roll})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-wrap gap-2">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">File: </span>
              <span className="text-xs font-mono text-slate-800 dark:text-slate-200 font-semibold">{selectedSub?.original_filename}</span>
              {selectedSub?.extracted_text && (
                <span className="ml-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  ({selectedSub.extracted_text.length.toLocaleString()} chars)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExtractWithLens}
                disabled={extractingWithLens}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
              >
                {extractingWithLens ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                )}
                <span>{extractingWithLens ? 'Extracting with Google Lens...' : '✨ Enhance with Google Lens Vision AI'}</span>
              </button>
              <OCRBadge confidence={selectedSub?.ocr_confidence} isVerified={selectedSub?.is_ocr_verified} />
            </div>
          </div>

          {/* Editable Student Credentials Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Student USN / Roll Number
              </label>
              <input
                type="text"
                value={selectedRoll}
                onChange={(e) => setSelectedRoll(e.target.value)}
                placeholder="e.g. 1HK23CS107 or 1HK23CS078"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                Student Full Name
              </label>
              <input
                type="text"
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                placeholder="e.g. Namratha U"
                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Modal View Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setModalTab('questions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'questions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              📋 Question-Guided Answers ({extractedAnswers.filter(a => a.is_attempted).length} Attempted)
            </button>
            <button
              type="button"
              onClick={() => setModalTab('raw')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'raw' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              📝 Full Document Text & Manual Editor
            </button>
          </div>

          {modalTab === 'questions' ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {loadingAnswers ? (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span>Loading question-guided answers...</span>
                </div>
              ) : extractedAnswers.length > 0 ? (
                extractedAnswers.map((item) => (
                  <div
                    key={item.question_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.is_attempted
                        ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        : 'bg-slate-50/40 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                          {item.question_number}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          (Max {item.max_marks}M)
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold ${
                        item.is_attempted
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {item.is_attempted ? `Attempted (${item.answer_text.length} chars)` : 'Not Attempted / Opted Out'}
                      </span>
                    </div>

                    {item.is_attempted ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed shadow-xs">
                        {item.answer_text}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-slate-500 italic pl-1">
                        Student did not attempt this question (alternative module choice selected).
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs space-y-3">
                  <p>No questions could be automatically segmented from this script yet.</p>
                  <button
                    type="button"
                    onClick={handleExtractWithLens}
                    disabled={extractingWithLens}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-indigo-200" />
                    <span>Extract Question Answers with Google Lens</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Document / Raw Extracted Text */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Raw Extracted OCR Output
                </h4>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-800 dark:text-slate-200 h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedSub?.extracted_text || 'No text extracted.'}
                </div>
              </div>

              {/* Editable Correction Area */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Teacher Editable Text
                </h4>
                <textarea
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder="Make any manual corrections for typos or unrecognized characters..."
                  className="w-full p-3.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-indigo-400 dark:border-indigo-500 text-xs font-mono text-slate-900 dark:text-slate-100 h-80 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-xs"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setSelectedSub(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCorrection}
              disabled={savingCorrection}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{savingCorrection ? 'Saving...' : 'Save & Update Text'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
