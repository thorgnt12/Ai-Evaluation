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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 mb-2">
          <GraduationCap className="w-9 h-9" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Student Assessment & Result Portal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Look up your official exam scorecards, AI feedback, and download signed PDF reports.
        </p>

        {/* Tab Switcher */}
        <div className="flex items-center justify-center gap-2 pt-4">
          <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('lookup')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'lookup' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5 inline mr-1.5 text-indigo-600 dark:text-indigo-400" /> Result Lookup & Scorecard
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'upload' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5 inline mr-1.5 text-indigo-600 dark:text-indigo-400" /> Self-Submit Answer Sheet
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: RESULT LOOKUP */}
      {activeTab === 'lookup' && (
        <div className="space-y-6">
          {/* Lookup Form */}
          <form onSubmit={handleLookup} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>Enter Your Credentials</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Exam Code *
                </label>
                <input
                  type="text"
                  placeholder="e.g. CS301-MID"
                  value={examCode}
                  onChange={(e) => setExamCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Student Roll Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 21CS001"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            {searchError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={searching}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {searching ? 'Searching Scorecard...' : 'View My Scorecard & Feedback'}
            </button>
          </form>

          {/* Result Scorecard Display */}
          {result && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6 animate-fade-in">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {result.exam_code}
                    </span>
                    {result.grading_mode && (
                      <GradingModeBadge mode={result.grading_mode} />
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{result.exam_title}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student: <b className="text-slate-800">{result.student_name}</b> (Roll: {result.student_roll})
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-3xl font-black text-slate-900">
                    {result.total_score} <span className="text-sm font-normal text-slate-500">/ {result.total_exam_marks}</span>
                  </div>
                  <div className="flex items-center md:justify-end gap-2 mt-1">
                    <Badge variant={result.passed ? 'success' : 'danger'} size="md">
                      {result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'} ({result.percentage}%)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Question Breakdown Table */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Question-Wise Evaluation & Feedback</span>
                </h3>

                <div className="space-y-3">
                  {result.evaluations?.map((ev, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">
                          {ev.question_number}: {ev.question_text ? (ev.question_text.slice(0, 70) + (ev.question_text.length > 70 ? '...' : '')) : ''}
                        </span>
                        <span className="font-bold font-mono text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-xs">
                          {ev.awarded_marks} / {ev.max_marks} Marks
                        </span>
                      </div>

                      {ev.strengths && ev.strengths.length > 0 && (
                        <div className="text-emerald-700">
                          <b>Strengths: </b>{ev.strengths.join(' • ')}
                        </div>
                      )}

                      {ev.feedback && (
                        <div className="text-slate-600">
                          <b>Feedback: </b>{ev.feedback}
                        </div>
                      )}

                      {ev.suggestions && (
                        <div className="text-indigo-700">
                          <b>Improvement Advice: </b>{ev.suggestions}
                        </div>
                      )}

                      {ev.is_overridden && (
                        <div className="text-amber-700 text-[11px] italic">
                          * Instructor adjusted score: {ev.override_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Download Official PDF */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <a
                  href={result.pdf_download_url}
                  download
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" /> <span>Download Official Signed Report (.pdf)</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SELF-SUBMIT ANSWER SHEET */}
      {activeTab === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Your Answer Sheet</h2>
            <p className="text-xs text-slate-500 mt-1">
              Submit your completed assignment or exam paper for automated OCR and AI grading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Exam Code *
              </label>
              <input
                type="text"
                value={uploadExamCode}
                onChange={(e) => setUploadExamCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS301-MID"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Your Roll Number *
              </label>
              <input
                type="text"
                value={upRoll}
                onChange={(e) => setUpRoll(e.target.value.toUpperCase())}
                placeholder="e.g. 21CS099"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={upName}
                onChange={(e) => setUpName(e.target.value)}
                placeholder="e.g. Liam Smith"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                value={upEmail}
                onChange={(e) => setUpEmail(e.target.value)}
                placeholder="liam.smith@student.edu"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-medium"
                required
              />
            </div>
          </div>

          {/* File Input */}
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-indigo-50/30 transition-all">
            <input
              type="file"
              id="student-file-sub"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => setUpFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="student-file-sub" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-slate-700 block">
                {upFile ? upFile.name : 'Select Answer Sheet File (PDF, DOCX, Scan Image)'}
              </span>
            </label>
          </div>

          {uploadError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1 text-xs text-emerald-800">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{uploadResult.message}</span>
              </div>
              <div>OCR Confidence Check: <b>{uploadResult.ocr_confidence}%</b></div>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 transition-all"
          >
            {uploading ? 'Processing & Submitting...' : 'Submit Answer Sheet'}
          </button>
        </form>
      )}
    </div>
  );
};
