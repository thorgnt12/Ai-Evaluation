import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, Upload, Download, CheckCircle2, 
  AlertCircle, Sparkles, BookOpen, FileText, ArrowLeft
} from 'lucide-react';
import { portalApi } from '../api/client';
import { Badge, OCRBadge, GradingModeBadge } from '../components/Badge';

export const StudentPortal = ({ setView }) => {
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' or 'upload'
  const [exams, setExams] = useState([]);
  
  // Lookup Form
  const [examCode, setExamCode] = useState('CS301-MID');
  const [studentRoll, setStudentRoll] = useState('21CS001');
  const [studentEmail, setStudentEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [searchError, setSearchError] = useState('');

  // Upload Form
  const [uploadExamCode, setUploadExamCode] = useState('');
  const [upRoll, setUpRoll] = useState('');
  const [upName, setUpName] = useState('');
  const [upEmail, setUpEmail] = useState('');
  const [upFile, setUpFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    portalApi.listExams()
      .then(res => {
        setExams(res.data);
        if (res.data.length > 0) {
          setUploadExamCode(res.data[0].exam_code);
          setExamCode(res.data[0].exam_code);
        }
      })
      .catch(console.error);
  }, []);

  const handleLookup = async (e) => {
    e.preventDefault();
    setSearching(true);
    setSearchError('');
    setResult(null);
    try {
      const res = await portalApi.lookupResult({
        exam_code: examCode.trim(),
        student_roll: studentRoll.trim(),
        student_email: studentEmail.trim() || undefined
      });
      setResult(res.data);
    } catch (err) {
      setSearchError(err.response?.data?.detail || 'Result not found. Please verify your roll number and exam code.');
    } finally {
      setSearching(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!upFile) {
      alert('Please select an answer sheet file.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('exam_code', uploadExamCode);
    formData.append('student_roll', upRoll);
    formData.append('student_name', upName);
    formData.append('student_email', upEmail);
    formData.append('file', upFile);

    try {
      const res = await portalApi.submitAnswerSheet(formData);
      setUploadResult(res.data);
    } catch (err) {
      setUploadError(err.response?.data?.detail || 'Submission failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-xl shadow-cyan-500/20 mb-2">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tight">
          Student Assessment & Result Portal
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Look up your official exam scorecards, AI feedback, and download signed PDF reports.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setActiveTab('lookup')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'lookup' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5 inline mr-1.5" /> Result Lookup & Scorecard
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" /> Self-Submit Answer Sheet
          </button>
        </div>
      </div>

      {/* TAB 1: RESULT LOOKUP */}
      {activeTab === 'lookup' && (
        <div className="space-y-6">
          {/* Lookup Form */}
          <form onSubmit={handleLookup} className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-400" /> Enter Your Credentials
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Exam Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS301-MID"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Student Roll Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 21CS001"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            {searchError && (
              <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {searchError}
              </div>
            )}

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {searching ? 'Searching Scorecard...' : 'View My Scorecard & Feedback'}
            </button>
          </form>

          {/* Result Scorecard Display */}
          {result && (
            <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-indigo-400 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      {result.exam_code}
                    </span>
                    {result.grading_mode && (
                      <GradingModeBadge mode={result.grading_mode} />
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-100">{result.exam_title}</h2>
                  <p className="text-xs text-slate-400">
                    Student: <b className="text-slate-200">{result.student_name}</b> (Roll: {result.student_roll})
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-3xl font-black text-slate-100">
                    {result.total_score} <span className="text-sm font-normal text-slate-400">/ {result.total_exam_marks}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <Badge variant={result.passed ? 'success' : 'danger'} size="md">
                      {result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'} ({result.percentage}%)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Question Breakdown Table */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Question-Wise Evaluation & Feedback
                </h3>

                <div className="space-y-3">
                  {result.evaluations?.map((ev, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 text-sm">
                          {ev.question_number}: {ev.question_text ? (ev.question_text.slice(0, 70) + (ev.question_text.length > 70 ? '...' : '')) : ''}
                        </span>
                        <span className="font-bold font-mono text-slate-100 bg-slate-800 px-2.5 py-1 rounded-lg">
                          {ev.awarded_marks} / {ev.max_marks} Marks
                        </span>
                      </div>

                      {ev.strengths && ev.strengths.length > 0 && (
                        <div className="text-emerald-400">
                          <b>Strengths: </b>{ev.strengths.join(' • ')}
                        </div>
                      )}

                      {ev.feedback && (
                        <div className="text-slate-400">
                          <b>Feedback: </b>{ev.feedback}
                        </div>
                      )}

                      {ev.suggestions && (
                        <div className="text-indigo-300">
                          <b>Improvement Advice: </b>{ev.suggestions}
                        </div>
                      )}

                      {ev.is_overridden && (
                        <div className="text-amber-400 text-[11px] italic">
                          * Instructor adjusted score: {ev.override_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Official PDF */}
              <div className="pt-4 border-t border-slate-800 flex justify-end">
                <a
                  href={result.pdf_download_url}
                  download
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download Official Signed Report (.pdf)
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SELF-SUBMIT ANSWER SHEET */}
      {activeTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Upload Your Answer Sheet</h2>
            <p className="text-xs text-slate-400 mt-1">
              Submit your completed assignment or exam paper for automated OCR and AI grading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Exam Code *
              </label>
              <input
                type="text"
                value={uploadExamCode}
                onChange={(e) => setUploadExamCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS301-MID"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Roll Number *
              </label>
              <input
                type="text"
                value={upRoll}
                onChange={(e) => setUpRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 21CS099"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={upName}
                onChange={(e) => setUpName(e.target.value)}
                placeholder="e.g. Liam Smith"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={upEmail}
                onChange={(e) => setUpEmail(e.target.value)}
                placeholder="liam.smith@student.edu"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* File Input */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-6 text-center bg-slate-900/40">
            <input
              type="file"
              id="student-file-sub"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => setUpFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="student-file-sub" className="cursor-pointer space-y-2 block">
              <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
              <span className="text-xs font-semibold text-slate-200 block">
                {upFile ? upFile.name : 'Select Answer Sheet File (PDF, DOCX, Scan Image)'}
              </span>
            </label>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl space-y-1 text-xs text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {uploadResult.message}
              </div>
              <div>OCR Confidence Check: <b>{uploadResult.ocr_confidence}%</b></div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 cursor-pointer disabled:opacity-50"
          >
            {uploading ? 'Processing & Submitting...' : 'Submit Answer Sheet'}
          </button>
        </form>
      )}
    </div>
  );
};
