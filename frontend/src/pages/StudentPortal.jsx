import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, Upload, Download, CheckCircle2, 
  AlertCircle, Sparkles, BookOpen, FileText, ArrowLeft, Printer, Check
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
          const pcExam = res.data.find(e => e.exam_code === 'BCS702');
          const defaultExam = pcExam || res.data[0];
          setUploadExamCode(defaultExam.exam_code);
          setExamCode(defaultExam.exam_code);
          if (defaultExam.exam_code === 'BCS702') {
            setStudentRoll('1HK23CS107');
          } else if (defaultExam.exam_code === 'CS301-MID') {
            setStudentRoll('21CS001');
          }
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Enter Your Credentials</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                    Exam Code *
                  </label>
                  {exams.length > 0 && (
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {exams.length} active exam{exams.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {exams.length > 0 ? (
                  <select
                    value={examCode}
                    onChange={(e) => {
                      setExamCode(e.target.value);
                      if (e.target.value === 'BCS702') setStudentRoll('1HK23CS107');
                      else if (e.target.value === 'CS301-MID') setStudentRoll('21CS001');
                      else if (e.target.value === 'ENV204-FINAL') setStudentRoll('22ENV001');
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium cursor-pointer"
                  >
                    {exams.map(ex => (
                      <option key={ex.id} value={ex.exam_code}>
                        {ex.exam_code} — {ex.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. BCS702 or CS301-MID"
                    value={examCode}
                    onChange={(e) => setExamCode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  USN / Roll Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1HK23CS107 or 1hk23cs124"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Case-insensitive (e.g. <span className="font-mono text-indigo-600 dark:text-indigo-400">1hk23cs107</span> or <span className="font-mono text-indigo-600 dark:text-indigo-400">1HK23CS107</span>). Direct lookup without re-uploading.
                </p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Quick Select USN:</span>
                  {['1HK23CS078', '1HK23CS094', '1HK23CS107', '1HK23CS124'].map(u => (
                    <button
                      type="button"
                      key={u}
                      onClick={() => setStudentRoll(u)}
                      className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-semibold border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {searchError && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
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
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6 animate-fade-in print:border-none print:shadow-none">
              {/* Header Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                      {result.exam_code}
                    </span>
                    {result.grading_mode && (
                      <GradingModeBadge mode={result.grading_mode} />
                    )}
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{result.exam_title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Student: <b className="text-slate-900 dark:text-slate-100">{result.student_name}</b></span>
                    <span>•</span>
                    <span>USN / Roll: <b className="font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">{result.student_roll}</b></span>
                    {result.student_email && (
                      <>
                        <span>•</span>
                        <span>Email: <b className="font-mono text-slate-700 dark:text-slate-300">{result.student_email}</b></span>
                      </>
                    )}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                    {result.total_score} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ {result.total_exam_marks}</span>
                  </div>
                  <div className="flex items-center md:justify-end gap-2 mt-1">
                    <Badge variant={result.passed ? 'success' : 'danger'} size="md">
                      {result.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'} ({result.percentage}%)
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>Overall Assessment Attainment</span>
                  <span>{result.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${result.passed ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-500 to-rose-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, result.percentage))}%` }}
                  />
                </div>
              </div>

              {/* Question Breakdown Table */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Question-Wise Evaluation & Feedback</span>
                </h3>

                <div className="space-y-3">
                  {result.evaluations?.map((ev, idx) => (
                    <div key={idx} className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700 space-y-2 text-xs shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {ev.question_number}: {ev.question_text ? (ev.question_text.slice(0, 70) + (ev.question_text.length > 70 ? '...' : '')) : ''}
                        </span>
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-xs">
                          {ev.awarded_marks} / {ev.max_marks} Marks
                        </span>
                      </div>

                      {ev.strengths && ev.strengths.length > 0 && (
                        <div className="text-emerald-700 dark:text-emerald-400">
                          <b>Strengths: </b>{ev.strengths.join(' • ')}
                        </div>
                      )}

                      {ev.feedback && (
                        <div className="text-slate-600 dark:text-slate-300">
                          <b>Feedback: </b>{ev.feedback}
                        </div>
                      )}

                      {ev.suggestions && (
                        <div className="text-indigo-700 dark:text-indigo-400">
                          <b>Improvement Advice: </b>{ev.suggestions}
                        </div>
                      )}

                      {ev.is_overridden && (
                        <div className="text-amber-700 dark:text-amber-400 text-[11px] italic">
                          * Instructor adjusted score: {ev.override_reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Print Scorecard & Download PDF */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  <span>Print Scorecard</span>
                </button>

                <a
                  href={result.pdf_download_url}
                  download
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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
        <form onSubmit={handleUploadSubmit} className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Upload Your Answer Sheet</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Submit your completed assignment or exam paper for automated OCR and AI grading.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Exam Code *
              </label>
              <input
                type="text"
                value={uploadExamCode}
                onChange={(e) => setUploadExamCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS301-MID"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                USN / Roll Number *
              </label>
              <input
                type="text"
                value={upRoll}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setUpRoll(val);
                  if (!upEmail || upEmail.endsWith('@hkbk.edu.in') || upEmail.endsWith('@student.edu')) {
                    setUpEmail(val ? `${val.toLowerCase()}@hkbk.edu.in` : '');
                  }
                }}
                placeholder="e.g. 1HK23CS078"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                value={upName}
                onChange={(e) => setUpName(e.target.value)}
                placeholder="e.g. Md. Shadab Talib"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                value={upEmail}
                onChange={(e) => setUpEmail(e.target.value)}
                placeholder="1hk23cs078@hkbk.edu.in"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all font-medium font-mono"
                required
              />
            </div>
          </div>

          {/* File Input */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-2xl p-6 text-center bg-slate-50/60 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all">
            <input
              type="file"
              id="student-file-sub"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={(e) => setUpFile(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="student-file-sub" className="cursor-pointer space-y-2 block">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-100 dark:border-indigo-800">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {upFile ? upFile.name : 'Select Answer Sheet File (PDF, DOCX, Scan Image)'}
              </span>
            </label>
          </div>

          {uploadError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl space-y-1 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
