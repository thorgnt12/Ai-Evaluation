import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Upload, Users, ShieldAlert, CheckCircle, 
  FileText, Edit3, Eye, Copy, Check, Sparkles, AlertTriangle
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
  const handleOpenOcrModal = (sub) => {
    setSelectedSub(sub);
    setCorrectedText(sub.extracted_text || '');
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

  const flaggedCount = submissions.filter(s => s.ocr_confidence < 70 && !s.is_ocr_verified).length;

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

      {/* OCR Quality Gate Alert Notice */}
      {flaggedCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-amber-300">
              {flaggedCount} Script(s) Flagged by Automated OCR Quality Gate (&lt;70% Confidence)
            </h4>
            <p className="text-xs text-amber-300/80 leading-relaxed">
              To guarantee assessment integrity, low-confidence scans are blocked from automated grading until you perform a side-by-side text verification. Click <b>"Verify Text"</b> on flagged scripts below.
            </p>
          </div>
        </div>
      )}

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
                const isFlagged = sub.ocr_confidence < 70 && !sub.is_ocr_verified;
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
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {sub.original_filename}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <OCRBadge confidence={sub.ocr_confidence} isVerified={sub.is_ocr_verified} />
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isFlagged ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" /> Blocked (OCR)
                        </span>
                      ) : sub.status === 'graded' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Graded ({sub.total_awarded_marks}M)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Ready for AI
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenOcrModal(sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-all cursor-pointer ${
                          isFlagged
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        {isFlagged ? 'Verify Text (Gate)' : 'Inspect Text'}
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
        title={`Side-by-Side OCR Quality Gate: ${selectedSub?.student_name} (${selectedSub?.student_roll})`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">File: </span>
              <span className="text-xs font-mono text-slate-200 font-semibold">{selectedSub?.original_filename}</span>
            </div>
            <OCRBadge confidence={selectedSub?.ocr_confidence} isVerified={selectedSub?.is_ocr_verified} />
          </div>

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
                <Edit3 className="w-3.5 h-3.5" /> Teacher Editable Text (Quality Gate)
              </h4>
              <textarea
                value={correctedText}
                onChange={(e) => setCorrectedText(e.target.value)}
                placeholder="Make any manual corrections for typos or unrecognized characters..."
                className="w-full p-3 bg-slate-900 rounded-xl border border-indigo-500/50 text-xs font-mono text-slate-100 h-80 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
              />
            </div>
          </div>

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
              {savingCorrection ? 'Verifying...' : 'Approve & Mark Ready for AI Grading'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
