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
    return <div className="p-12 text-center text-slate-400">Loading submissions...</div>;
  }

  const flaggedCount = submissions.filter(s => s.status === 'ocr_flagged' && !s.is_ocr_verified).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('dashboard')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('grading')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" /> Proceed to AI Grading Engine
          </button>
        </div>
      </div>

      {/* Exam Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold">
              {exam?.exam_code}
            </span>
            <span className="text-xs text-slate-400">{exam?.subject}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">{exam?.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Ingestion & OCR Quality Gate Control
          </p>
        </div>

        {/* Share Link for Students */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800">
          <div className="text-xs text-slate-300 pl-2">
            Student Submission Link:
          </div>
          <button
            onClick={copyPortalLink}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            {copiedLink ? 'Link Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-3xl p-8 text-center bg-slate-900/40 transition-colors">
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
          <Upload className="w-10 h-10 text-indigo-400 mx-auto" />
          <div>
            <span className="text-sm font-bold text-slate-200">
              {uploading ? 'Processing & Extracting OCR...' : 'Drag and drop or click to bulk upload student answer sheets'}
            </span>
            <p className="text-xs text-slate-400 mt-1">
              Supports multiple PDFs, DOCX, TXT, and scanned image sheets simultaneously
            </p>
          </div>
        </label>
      </div>

      {/* Submissions Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-slate-100">
              Enrolled Student Submissions ({submissions.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4 text-center">OCR Confidence</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {submissions.map((sub) => {
                return (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-100">
                      {sub.student_roll}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {sub.student_name}
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {sub.student_email}
                      </span>
                      {sub.module_scores && (() => {
                        try {
                          const mData = typeof sub.module_scores === 'string' ? JSON.parse(sub.module_scores) : sub.module_scores;
                          return (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {Object.entries(mData).map(([modName, modInfo]) => (
                                <span key={modName} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono" title={`${modInfo.choice_group}: Option ${modInfo.selected_option}`}>
                                  {modName}: <b className="text-emerald-400 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                                </span>
                              ))}
                            </div>
                          );
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {sub.original_filename}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <OCRBadge confidence={sub.ocr_confidence} isVerified={sub.is_ocr_verified} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {sub.status === 'graded' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Graded ({sub.total_awarded_marks} / 50M)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Ready for AI
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenOcrModal(sub)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Inspect / Edit Text
                      </button>
                    </td>
                  </tr>
                );
              })}
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
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 flex-wrap gap-2">
            <div>
              <span className="text-xs text-slate-400">File: </span>
              <span className="text-xs font-mono text-slate-200 font-semibold">{selectedSub?.original_filename}</span>
              {selectedSub?.extracted_text && (
                <span className="ml-2 text-[11px] text-slate-400 font-mono">
                  ({selectedSub.extracted_text.length.toLocaleString()} chars)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExtractWithLens}
                disabled={extractingWithLens}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {extractingWithLens ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-cyan-300" />
                )}
                {extractingWithLens ? 'Extracting with Google Lens...' : '✨ Enhance with Google Lens Vision AI'}
              </button>
              <OCRBadge confidence={selectedSub?.ocr_confidence} isVerified={selectedSub?.is_ocr_verified} />
            </div>
          </div>

          {/* Modal View Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setModalTab('questions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'questions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              📋 Question-Guided Answers ({extractedAnswers.filter(a => a.is_attempted).length} Attempted)
            </button>
            <button
              type="button"
              onClick={() => setModalTab('raw')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                modalTab === 'raw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 bg-slate-900'
              }`}
            >
              📝 Full Document Text & Manual Editor
            </button>
          </div>

          {modalTab === 'questions' ? (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {loadingAnswers ? (
                <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span>Loading question-guided answers...</span>
                </div>
              ) : extractedAnswers.length > 0 ? (
                extractedAnswers.map((item) => (
                  <div
                    key={item.question_id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      item.is_attempted
                        ? 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/50'
                        : 'bg-slate-950/30 border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-sm text-slate-100">
                          {item.question_number}
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          (Max {item.max_marks}M)
                        </span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                        item.is_attempted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {item.is_attempted ? `Attempted (${item.answer_text.length} chars)` : 'Not Attempted / Opted Out'}
                      </span>
                    </div>

                    {item.is_attempted ? (
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                        {item.answer_text}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic pl-1">
                        Student did not attempt this question (alternative module choice selected).
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                  <p>No questions could be automatically segmented from this script yet.</p>
                  <button
                    type="button"
                    onClick={handleExtractWithLens}
                    disabled={extractingWithLens}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4 text-cyan-300" />
                    Extract Question Answers with Google Lens
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original Document / Raw Extracted Text */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Raw Extracted OCR Output
                </h4>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 h-80 overflow-y-auto whitespace-pre-wrap">
                  {selectedSub?.extracted_text || 'No text extracted.'}
                </div>
              </div>

              {/* Editable Correction Area */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Teacher Editable Text
                </h4>
                <textarea
                  value={correctedText}
                  onChange={(e) => setCorrectedText(e.target.value)}
                  placeholder="Make any manual corrections for typos or unrecognized characters..."
                  className="w-full p-3 bg-slate-900 rounded-xl border border-indigo-500/50 text-xs font-mono text-slate-100 h-80 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setSelectedSub(null)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCorrection}
              disabled={savingCorrection}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {savingCorrection ? 'Saving...' : 'Save & Update Text'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
