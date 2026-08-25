import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, Upload, Plus, Trash2, CheckCircle2, 
  BookOpen, Sparkles, FileText, Globe, Layers, AlertCircle
} from 'lucide-react';
import { examsApi, questionsApi } from '../api/client';
import { Badge } from '../components/Badge';

export const ExamWizard = ({ setView, onExamCreated }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdExam, setCreatedExam] = useState(null);

  // Step 1 Form
  const [examForm, setExamForm] = useState({
    title: '',
    subject: '',
    exam_code: '',
    total_marks: 25.0,
    pass_marks: 10.0,
    term: 'Fall Mid-Term',
    grace_marks: 0.0,
    grading_mode: 'notes_grounded', // notes_grounded or rubric_web_validated
    allow_student_upload: true,
    allow_replacement: false
  });

  // Step 2 Question Paper Parsing & Interactive List
  const [qpFile, setQpFile] = useState(null);
  const [rawQpText, setRawQpText] = useState('');
  const [questions, setQuestions] = useState([]);

  // Step 3 Knowledge Document / Rubric
  const [knowledgeFile, setKnowledgeFile] = useState(null);
  const [knowledgeText, setKnowledgeText] = useState('');

  // 1. Submit Step 1: Create Exam
  const handleCreateExamMeta = async (e) => {
    e.preventDefault();
    if (!examForm.title || !examForm.subject || !examForm.exam_code) {
      alert('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await examsApi.create(examForm);
      setCreatedExam(res.data);
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Step 2: Upload Question Paper
  const handleUploadQP = async (e) => {
    const file = e.target.files[0];
    if (!file || !createdExam) return;
    setQpFile(file);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await questionsApi.uploadQP(createdExam.id, formData);
      setRawQpText(res.data.raw_text);
      if (res.data.detected_questions && res.data.detected_questions.length > 0) {
        setQuestions(res.data.detected_questions.map((q, idx) => ({
          question_number: q.question_number || `Q${idx + 1}`,
          question_text: q.question_text,
          max_marks: q.max_marks || 5.0,
          grading_type: 'concept_coverage',
          model_answer: q.extracted_model_answer || '',
          rubric_items: []
        })));
      } else {
        // Fallback default starter questions
        setQuestions([
          {
            question_number: 'Q1',
            question_text: 'Explain the core principles and operational mechanisms.',
            max_marks: 10.0,
            grading_type: 'concept_coverage',
            rubric_items: []
          }
        ]);
      }
    } catch (err) {
      alert('Error parsing question paper: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question_number: `Q${questions.length + 1}`,
        question_text: '',
        max_marks: 5.0,
        grading_type: 'concept_coverage',
        rubric_items: []
      }
    ]);
  };

  const handleRemoveQuestion = (index) => {
    setQuestions(questions.filter((_, idx) => idx !== index));
  };

  const handleQuestionChange = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  // 3. Step 3: Upload Knowledge / Notes / Marking Scheme
  const handleUploadKnowledge = async (e) => {
    const file = e.target.files[0];
    if (!file || !createdExam) return;
    setKnowledgeFile(file);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', examForm.grading_mode === 'notes_grounded' ? 'notes' : 'marking_scheme');

    try {
      const res = await questionsApi.uploadKnowledge(createdExam.id, formData);
      setKnowledgeText(res.data.extracted_text);
    } catch (err) {
      alert('Error uploading knowledge document: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Final Save Questions & Rubrics
  const handleFinalizeSetup = async () => {
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    setLoading(true);
    try {
      await questionsApi.saveQuestions(createdExam.id, questions);
      if (onExamCreated) onExamCreated(createdExam.id);
      setView('dashboard');
    } catch (err) {
      alert('Error saving questions: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('dashboard')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Steps Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={`px-3 py-1 rounded-full ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            1. Exam Info & Mode
          </span>
          <span className="text-slate-600">→</span>
          <span className={`px-3 py-1 rounded-full ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            2. Question Paper
          </span>
          <span className="text-slate-600">→</span>
          <span className={`px-3 py-1 rounded-full ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            3. Rubric & Knowledge
          </span>
        </div>
      </div>

      {/* STEP 1: EXAM DETAILS & SCENARIO MODE */}
      {step === 1 && (
        <form onSubmit={handleCreateExamMeta} className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Step 1: Exam Details & Grading Mode</h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure course parameters, grading criteria, and select your evaluation mode.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                placeholder="e.g. CS301: Operating Systems Mid-Term"
                value={examForm.title}
                onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Subject / Discipline *
              </label>
              <input
                type="text"
                placeholder="e.g. Computer Science"
                value={examForm.subject}
                onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Unique Exam Code *
              </label>
              <input
                type="text"
                placeholder="e.g. CS301-FALL"
                value={examForm.exam_code}
                onChange={(e) => setExamForm({ ...examForm, exam_code: e.target.value.toUpperCase() })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Academic Term / Semester
              </label>
              <input
                type="text"
                placeholder="e.g. Fall Mid-Term 2026"
                value={examForm.term}
                onChange={(e) => setExamForm({ ...examForm, term: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Total Exam Marks
              </label>
              <input
                type="number"
                step="1"
                value={examForm.total_marks}
                onChange={(e) => setExamForm({ ...examForm, total_marks: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Passing Marks Threshold
              </label>
              <input
                type="number"
                step="1"
                value={examForm.pass_marks}
                onChange={(e) => setExamForm({ ...examForm, pass_marks: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Grading Mode Selector */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Select AI Grading Scenario *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setExamForm({ ...examForm, grading_mode: 'notes_grounded' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  examForm.grading_mode === 'notes_grounded'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <span className="font-bold text-slate-100 text-sm">Scenario A: Notes-Grounded Evaluation</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI compares student answers strictly against teacher lecture notes, syllabus, or model answers using semantic embedding matching and concept coverage.
                </p>
              </div>

              <div
                onClick={() => setExamForm({ ...examForm, grading_mode: 'rubric_web_validated' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  examForm.grading_mode === 'rubric_web_validated'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-2 ring-cyan-500/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-slate-100 text-sm">Scenario B: Rubric + Web-Validated</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI uses marking scheme points and verifies factual context against trusted academic & standards web sources. The teacher's rubric strictly governs marks; citations are surfaced for review.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
            >
              Continue to Question Paper <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: QUESTION PAPER UPLOAD & PARSER */}
      {step === 2 && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Step 2: Upload & Parse Question Paper</h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload your Question Paper (PDF, DOCX, TXT, or Image). Our AI parser will detect question numbers, text prompts, and mark allocations.
            </p>
          </div>

          {/* Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center bg-slate-900/40 transition-colors">
            <input
              type="file"
              id="qp-file-input"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleUploadQP}
              className="hidden"
            />
            <label htmlFor="qp-file-input" className="cursor-pointer space-y-3 block">
              <Upload className="w-10 h-10 text-indigo-400 mx-auto" />
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  {qpFile ? qpFile.name : 'Click or drop Question Paper document'}
                </span>
                <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT, Scanned Images</p>
              </div>
            </label>
          </div>

          {/* Interactive Question List */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-200">
                Parsed Questions ({questions.length})
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.map((q, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-24">
                    <input
                      type="text"
                      value={q.question_number}
                      onChange={(e) => handleQuestionChange(idx, 'question_number', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-bold"
                      placeholder="Q1"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Max Marks:</span>
                    <input
                      type="number"
                      step="0.5"
                      value={q.max_marks}
                      onChange={(e) => handleQuestionChange(idx, 'max_marks', parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={q.question_text}
                  onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                  placeholder="Enter full question prompt text..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              Continue to Rubric & Knowledge <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: KNOWLEDGE DOCUMENT / RUBRIC SETUP */}
      {step === 3 && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              Step 3: Upload {examForm.grading_mode === 'notes_grounded' ? 'Teacher Notes / Syllabus' : 'Official Marking Scheme'}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Upload your course notes or marking rubric. The AI engine will extract concept weights, synonyms, and expected key points automatically.
            </p>
          </div>

          {/* Upload Knowledge Document */}
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-2xl p-8 text-center bg-slate-900/40 transition-colors">
            <input
              type="file"
              id="knowledge-file-input"
              accept=".pdf,.docx,.txt"
              onChange={handleUploadKnowledge}
              className="hidden"
            />
            <label htmlFor="knowledge-file-input" className="cursor-pointer space-y-3 block">
              <FileText className="w-10 h-10 text-cyan-400 mx-auto" />
              <div>
                <span className="text-sm font-semibold text-slate-200">
                  {knowledgeFile ? knowledgeFile.name : 'Upload Notes, Syllabus or Marking Scheme'}
                </span>
                <p className="text-xs text-slate-400 mt-1">PDF, Word DOCX, or Text notes</p>
              </div>
            </label>
          </div>

          {/* Extracted Text Preview */}
          {knowledgeText && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" /> Extracted Reference Knowledge Preview
              </h4>
              <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3 rounded-lg max-h-36 overflow-y-auto">
                {knowledgeText}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleFinalizeSetup}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> Save & Activate Exam Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
