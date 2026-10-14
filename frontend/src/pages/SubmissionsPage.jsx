import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Users, ShieldAlert, CheckCircle, 
  FileText, Edit3, Eye, Copy, Check, Sparkles, AlertTriangle,
  Camera, RefreshCw
} from 'lucide-react';
import { examsApi, submissionsApi } from '../api/client';
import { Badge, OCRBadge } from '../components/Badge';
import { Modal } from '../components/Modal';

export const SubmissionsPage = ({ examId, setView }) => {
  const [exam, setExam] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // OCR Verification Modal State
  const [selectedSub, setSelectedSub] = useState(null);
  const [correctedText, setCorrectedText] = useState('');
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
          ocr_confidence: res.data.ocr_confidence,
          is_ocr_verified: true,
          status: res.data.status
        }));
        setCorrectedText(res.data.extracted_text);
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

  // Save Text Correction
  const handleSaveCorrection = async () => {
    if (!selectedSub) return;
    setSavingCorrection(true);
    try {
      await submissionsApi.correctOCRText({
        submission_id: selectedSub.id,
        corrected_text: correctedText,
        reason: 'Teacher manual side-by-side text review & approval'
      });
      setSelectedSub(null);
      await fetchData();
    } catch (err) {
      alert('Failed to verify text: ' + (err.response?.data?.detail || err.message));
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

  const flaggedCount = submissions.filter(s => s.status === 'ocr_flagged' && !s.is_ocr_verified).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-md font-bold">
              {exam?.exam_code}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-600">{exam?.subject}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">{exam?.title}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ingestion & OCR Quality Gate Control • Teacher-in-the-Loop Verification
          </p>
        </div>

        {/* Share Link for Students */}
        <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 shadow-xs self-stretch md:self-auto">
          <div className="text-xs text-slate-600 pl-2 font-medium">
            Student Submission Link:
          </div>
          <button
            onClick={copyPortalLink}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-600" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 sm:p-10 text-center bg-slate-50/60 hover:bg-indigo-50/30 transition-all">
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
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100 shadow-xs">
            {uploading ? (
              <RefreshCw className="w-7 h-7 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>
          <div>
            <span className="text-base font-bold text-slate-800 block">
              {uploading ? 'Processing & Extracting OCR...' : 'Drag and drop or click to bulk upload student answer sheets'}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Supports multiple PDFs, DOCX, TXT, and scanned image sheets simultaneously
            </p>
          </div>
        </label>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Enrolled Student Submissions ({submissions.length})
              </h3>
              <p className="text-xs text-slate-500">Review OCR confidence, inspect extracted text, and verify student responses</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4 text-center">OCR Confidence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No submissions uploaded yet. Use the upload box above to add student answer sheets.
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => {
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {sub.student_roll}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900">{sub.student_name}</div>
                        <span className="block text-[11px] text-slate-500 font-normal">
                          {sub.student_email}
                        </span>
                        {sub.module_scores && (() => {
                          try {
                            const mData = typeof sub.module_scores === 'string' ? JSON.parse(sub.module_scores) : sub.module_scores;
                            return (
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {Object.entries(mData).map(([modName, modInfo]) => (
                                  <span key={modName} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono" title={`${modInfo.choice_group}: Option ${modInfo.selected_option}`}>
                                    {modName}: <b className="text-emerald-700 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                                  </span>
                                ))}
                              </div>
                            );
                          } catch (e) {
                            return null;
                          }
                        })()}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {sub.original_filename}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <OCRBadge confidence={sub.ocr_confidence} isVerified={sub.is_ocr_verified} />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {sub.status === 'graded' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Graded ({sub.total_awarded_marks} / 50M)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Ready for AI
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenOcrModal(sub)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
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
      </div>

      {/* SIDE-BY-SIDE OCR VERIFICATION MODAL */}
      <Modal
        isOpen={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title={`Text Inspector & Editor: ${selectedSub?.student_name} (${selectedSub?.student_roll})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 flex-wrap gap-2">
            <div>
              <span className="text-xs text-slate-500 font-medium">File: </span>
              <span className="text-xs font-mono text-slate-800 font-semibold">{selectedSub?.original_filename}</span>
              {selectedSub?.extracted_text && (
                <span className="ml-2 text-[11px] text-slate-500 font-mono">
                  ({selectedSub.extracted_text.length.toLocaleString()} chars)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExtractWithLens}
                disabled={extractingWithLens}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
              >
                {extractingWithLens ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{extractingWithLens ? 'Extracting with Google Lens...' : '✨ Enhance with Google Lens Vision AI'}</span>
              </button>
              <OCRBadge confidence={selectedSub?.ocr_confidence} isVerified={selectedSub?.is_ocr_verified} />
            </div>
          </div>

          {/* Modal View Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <button
              type="button"
              onClick={() => setModalTab('questions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'questions' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              📋 Question-Guided Answers ({extractedAnswers.filter(a => a.is_attempted).length} Attempted)
            </button>
            <button
              type="button"
              onClick={() => setModalTab('raw')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'raw' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              📝 Full Document Text & Manual Editor
            </button>
          </div>

          {modalTab === 'questions' ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {loadingAnswers ? (
                <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                  <span>Loading question-guided answers...</span>
                </div>
              ) : extractedAnswers.length > 0 ? (
                extractedAnswers.map((item) => (
                  <div
                    key={item.question_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.is_attempted
                        ? 'bg-slate-50 border-slate-200 hover:border-slate-300'
                        : 'bg-slate-50/40 border-slate-200/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-900">
                          {item.question_number}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal">
                          (Max {item.max_marks}M)
                        </span>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-semibold ${
                        item.is_attempted
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {item.is_attempted ? `Attempted (${item.answer_text.length} chars)` : 'Not Attempted / Opted Out'}
                      </span>
                    </div>

                    {item.is_attempted ? (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed shadow-xs">
                        {item.answer_text}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic pl-1">
                        Student did not attempt this question (alternative module choice selected).
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs space-y-3">
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Raw Extracted OCR Output
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                  {selectedSub?.extracted_text || 'No text extracted.'}
                </div>
              </div>

              {/* Editable Correction Area */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Teacher Editable Text
                </h4>
                <textarea
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder="Make any manual corrections for typos or unrecognized characters..."
                  className="w-full p-3.5 bg-white rounded-xl border-2 border-indigo-400 text-xs font-mono text-slate-900 h-80 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 resize-none shadow-xs"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setSelectedSub(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
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
