import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ArrowRight, Upload, Plus, Trash2, CheckCircle2, 
  BookOpen, Sparkles, FileText, Globe, Layers, AlertCircle, RefreshCw,
  Camera, Key, Check, HelpCircle, ChevronDown, ChevronUp, Copy, ListChecks,
  ExternalLink, Edit3, Sliders, CheckCheck
} from 'lucide-react';
import { examsApi, questionsApi, lensApi } from '../api/client';
import { Badge } from '../components/Badge';

export const ExamWizard = ({ setView, onExamCreated }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdExam, setCreatedExam] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

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
  
  // Google Lens & Vision AI Configuration
  const [lensStatus, setLensStatus] = useState({ active: false, has_key: false, masked_key: '' });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [useGoogleLens, setUseGoogleLens] = useState(true);
  const [groupByMain, setGroupByMain] = useState(false); // false: sub-questions (1a..5b), true: 5 main questions (Q1..Q5)
  const [engineUsed, setEngineUsed] = useState('');

  // Fetch Lens status on mount
  useEffect(() => {
    lensApi.getStatus().then(res => {
      if (res.data) setLensStatus(res.data);
    }).catch(console.error);
  }, []);

  // Step 3 Knowledge Document / Rubric
  const [knowledgeFile, setKnowledgeFile] = useState(null);
  const [knowledgeText, setKnowledgeText] = useState('');
  const [knowledgeMeta, setKnowledgeMeta] = useState({ lineCount: 0, charCount: 0 });
  const [extractedRubrics, setExtractedRubrics] = useState({});
  const [isExpandedKnowledge, setIsExpandedKnowledge] = useState(false);
  const [copiedKnowledge, setCopiedKnowledge] = useState(false);

  // Step 3 Web Search Reference Answers State (Option 2 / Web Search Evaluation)
  const [webAnswers, setWebAnswers] = useState([]);
  const [webAnswersLoading, setWebAnswersLoading] = useState(false);
  const [editingAnswerIdx, setEditingAnswerIdx] = useState(null);
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);
  const [copiedAnswerIdx, setCopiedAnswerIdx] = useState(null);

  // 1. Submit Step 1: Create Exam
  const handleCreateExamMeta = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    if (!examForm.title?.trim() || !examForm.subject?.trim() || !examForm.exam_code?.trim()) {
      setErrorMsg('Please fill in Exam Title, Subject, and Unique Exam Code.');
      return;
    }
    setLoading(true);
    try {
      const res = await examsApi.create(examForm);
      setCreatedExam(res.data);
      setStep(2);
    } catch (err) {
      console.error('Failed to create exam:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to create exam. Please try again.';
      setErrorMsg(detail);
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
    setWebAnswers([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('group_by_main', groupByMain);
    formData.append('use_google_lens', useGoogleLens);

    try {
      const res = await questionsApi.uploadQP(createdExam.id, formData);
      setRawQpText(res.data.raw_text);
      setEngineUsed(res.data.engine_used || '');
      if (res.data.detected_questions && res.data.detected_questions.length > 0) {
        setQuestions(res.data.detected_questions.map((q, idx) => ({
          question_number: q.question_number || `Q${idx + 1}`,
          question_text: q.question_text,
          max_marks: q.max_marks || 5.0,
          has_table: q.has_table || q.question_text.includes('| --- |') || q.question_text.includes('| :--- |'),
          has_diagram: q.has_diagram || q.question_text.includes('Diagram Requirement'),
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
            has_table: false,
            has_diagram: false,
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

  // Re-extract using chosen mode or updated Lens settings
  const handleReextract = async (modeOverride = null) => {
    if (!createdExam) return;
    const targetMode = modeOverride !== null ? modeOverride : groupByMain;
    setLoading(true);
    setWebAnswers([]);
    try {
      const res = await lensApi.reextract(createdExam.id, {
        group_by_main: targetMode,
        use_google_lens: useGoogleLens
      });
      setRawQpText(res.data.raw_text);
      setEngineUsed(res.data.engine_used || '');
      if (res.data.detected_questions && res.data.detected_questions.length > 0) {
        setQuestions(res.data.detected_questions.map((q, idx) => ({
          question_number: q.question_number || `Q${idx + 1}`,
          question_text: q.question_text,
          max_marks: q.max_marks || 5.0,
          has_table: q.has_table || q.question_text.includes('| --- |') || q.question_text.includes('| :--- |'),
          has_diagram: q.has_diagram || q.question_text.includes('Diagram Requirement'),
          grading_type: 'concept_coverage',
          model_answer: q.extracted_model_answer || '',
          rubric_items: []
        })));
      }
    } catch (err) {
      alert('Error re-extracting: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    setLoading(true);
    try {
      await lensApi.setKey(apiKeyInput.trim());
      const st = await lensApi.getStatus();
      setLensStatus(st.data);
      setShowKeyModal(false);
      setApiKeyInput('');
      alert('Google Lens / Gemini Vision API key connected successfully!');
      if (createdExam && qpFile) {
        handleReextract();
      }
    } catch (err) {
      alert('Failed to save API key: ' + (err.response?.data?.detail || err.message));
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
        has_table: false,
        has_diagram: false,
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
    formData.append('questions_json', JSON.stringify(questions));

    try {
      const res = await questionsApi.uploadKnowledge(createdExam.id, formData);
      const text = res.data.extracted_text || '';
      setKnowledgeText(text);
      setKnowledgeMeta({
        lineCount: res.data.line_count || text.split('\n').length,
        charCount: res.data.char_count || text.length
      });
      if (res.data.rubrics_by_question) {
        setExtractedRubrics(res.data.rubrics_by_question);
        // Map extracted rubrics onto questions
        const updated = questions.map(q => {
          const matchedRubrics = res.data.rubrics_by_question[q.question_number];
          if (matchedRubrics && matchedRubrics.length > 0) {
            return { ...q, rubric_items: matchedRubrics };
          }
          return q;
        });
        setQuestions(updated);
      }
    } catch (err) {
      alert('Error uploading knowledge document: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch / Generate Web Search Reference Answers for all questions
  const handleFetchWebAnswers = async (questionsToQuery = null) => {
    const targetQuestions = questionsToQuery || questions;
    if (!targetQuestions || targetQuestions.length === 0 || !createdExam) return;
    setWebAnswersLoading(true);
    try {
      const res = await questionsApi.generateWebAnswers(createdExam.id, {
        questions: targetQuestions.map(q => ({
          question_number: q.question_number,
          question_text: q.question_text,
          max_marks: q.max_marks,
          has_table: q.has_table,
          has_diagram: q.has_diagram
        }))
      });
      if (res.data && res.data.generated_answers) {
        setWebAnswers(res.data.generated_answers);
        // Sync model answers and rubrics onto questions array
        const updated = questions.map(q => {
          const matched = res.data.generated_answers.find(ans => ans.question_number === q.question_number);
          if (matched) {
            return {
              ...q,
              model_answer: matched.model_answer,
              sample_points: matched.sample_points,
              rubric_items: matched.rubric_items || []
            };
          }
          return q;
        });
        setQuestions(updated);
      }
    } catch (err) {
      console.error('Failed to generate web answers:', err);
      alert('Error generating web search answers: ' + (err.response?.data?.detail || err.message));
    } finally {
      setWebAnswersLoading(false);
    }
  };

  // Re-generate web answer for a single question
  const handleRegenerateSingleAnswer = async (idx) => {
    const q = questions[idx];
    if (!q || !createdExam) return;
    setRegeneratingIdx(idx);
    try {
      const res = await questionsApi.generateSingleWebAnswer(createdExam.id, {
        question_number: q.question_number,
        question_text: q.question_text,
        max_marks: q.max_marks
      });
      if (res.data && res.data.generated_answer) {
        const genAns = res.data.generated_answer;
        setWebAnswers(prev => {
          const updated = [...prev];
          const foundIdx = updated.findIndex(w => w.question_number === q.question_number);
          if (foundIdx >= 0) {
            updated[foundIdx] = genAns;
          } else {
            updated.push(genAns);
          }
          return updated;
        });
        setQuestions(prev => {
          const updated = [...prev];
          updated[idx] = {
            ...q,
            model_answer: genAns.model_answer,
            sample_points: genAns.sample_points,
            rubric_items: genAns.rubric_items || []
          };
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to regenerate single answer:', err);
      alert('Error regenerating web answer: ' + (err.response?.data?.detail || err.message));
    } finally {
      setRegeneratingIdx(null);
    }
  };

  // Update model answer text for a question
  const handleUpdateModelAnswer = (qNum, newText) => {
    setWebAnswers(prev => prev.map(w => w.question_number === qNum ? { ...w, model_answer: newText } : w));
    setQuestions(prev => prev.map(q => q.question_number === qNum ? { ...q, model_answer: newText } : q));
  };

  // Update rubric criteria weight or description for a question
  const handleUpdateRubricItem = (qNum, rIdx, field, value) => {
    setWebAnswers(prev => prev.map(w => {
      if (w.question_number === qNum && w.rubric_items) {
        const updatedItems = [...w.rubric_items];
        updatedItems[rIdx] = { ...updatedItems[rIdx], [field]: value };
        return { ...w, rubric_items: updatedItems };
      }
      return w;
    }));
    setQuestions(prev => prev.map(q => {
      if (q.question_number === qNum && q.rubric_items) {
        const updatedItems = [...q.rubric_items];
        updatedItems[rIdx] = { ...updatedItems[rIdx], [field]: value };
        return { ...q, rubric_items: updatedItems };
      }
      return q;
    }));
  };

  // Final Save Questions & Rubrics (navigates to dashboard or submissions page)
  const handleFinalizeSetup = async (targetView = 'dashboard') => {
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    setLoading(true);
    try {
      // Merge web answers into questions if in Option 2
      const finalQuestions = questions.map(q => {
        const wa = webAnswers.find(w => w.question_number === q.question_number);
        if (wa) {
          return {
            ...q,
            model_answer: wa.model_answer || q.model_answer,
            sample_points: wa.sample_points || q.sample_points,
            rubric_items: (wa.rubric_items && wa.rubric_items.length > 0) ? wa.rubric_items : (q.rubric_items || [])
          };
        }
        return q;
      });

      await questionsApi.saveQuestions(createdExam.id, finalQuestions);
      if (onExamCreated) onExamCreated(createdExam.id);
      setView(targetView);
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
              {examForm.grading_mode === 'rubric_web_validated' ? '3. Web Search Answers Review' : '3. Notes & Rubric'}
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
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Select Evaluation Type *
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose how student submissions will be evaluated against reference materials.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* OPTION 1 */}
              <div
                onClick={() => setExamForm({ ...examForm, grading_mode: 'notes_grounded' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  examForm.grading_mode === 'notes_grounded'
                    ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-400" />
                    <span className="font-bold text-slate-100 text-sm">Option 1: Notes & Rubric Grounded</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Moderate Correction
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="text-indigo-400">Inputs:</span> Answersheet + Question Paper + Notes or Rubric
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Evaluates student answers against your uploaded lecture notes, syllabus, or marking scheme. Uses <b>moderate, balanced correction</b> — fair partial credit, forgiving of slight phrasing variations, and not overly strict.
                  </p>
                </div>
              </div>

              {/* OPTION 2 */}
              <div
                onClick={() => setExamForm({ ...examForm, grading_mode: 'rubric_web_validated' })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  examForm.grading_mode === 'rubric_web_validated'
                    ? 'bg-cyan-950/50 border-cyan-500 ring-2 ring-cyan-500/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <span className="font-bold text-slate-100 text-sm">Option 2: Open Web Search Evaluation</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Lenient Correction
                  </span>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <span className="text-cyan-400">Inputs:</span> Answersheet + Question Paper ONLY (No Notes/Rubric Needed)
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Searches the web (Wikipedia, DuckDuckGo, academic sources) for reference answers for every question. Applies <b>lenient, student-friendly correction</b> — rewards conceptual intuition generously with live citations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2.5 shadow-md">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleCreateExamMeta}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Creating Exam Workspace...
                </>
              ) : (
                <>
                  Continue to Question Paper <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* STEP 2: QUESTION PAPER UPLOAD & PARSER */}
      {step === 2 && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                Step 2: Upload & Parse Question Paper
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Google Lens Enabled
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Upload your exam paper. AI extracts question numbers, exact marks, math formulas, and preserves all data tables and diagram requirements.
              </p>
            </div>

            {/* Layout Toggle: Sub-Questions vs 5 Main Questions */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  setGroupByMain(false);
                  if (qpFile || (createdExam && createdExam.question_paper_path)) {
                    handleReextract(false);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  !groupByMain
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sub-Questions (1a...5b)
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupByMain(true);
                  if (qpFile || (createdExam && createdExam.question_paper_path)) {
                    handleReextract(true);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  groupByMain
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                5 Main Questions (Q1...Q5)
              </button>
            </div>
          </div>

          {/* Google Lens & Vision AI Intelligence Panel */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">Google Lens & Vision Intelligence</span>
                    {lensStatus.active ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Lens Active ({lensStatus.masked_key})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Enhanced Vision OCR Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {lensStatus.active
                      ? 'Extracts high-resolution visual layout, tables, diagrams, and marks using Google multimodal vision.'
                      : 'Connect your Google Gemini API key to activate full Google Lens multimodal document OCR, or use enhanced local vision.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(!showKeyModal)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-all"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  {lensStatus.active ? 'Update Lens Key' : 'Connect Google Lens Key'}
                </button>

                {(qpFile || (createdExam && createdExam.question_paper_path)) && (
                  <button
                    type="button"
                    onClick={() => handleReextract()}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 border border-indigo-500/40 cursor-pointer transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Re-extract
                  </button>
                )}
              </div>
            </div>

            {/* Inline Key Configuration Modal */}
            {showKeyModal && (
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Paste Google Gemini API Key (e.g. AIzaSy...)"
                  className="flex-1 w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  disabled={loading || !apiKeyInput.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Save & Enable Lens
                </button>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
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
                  {qpFile ? qpFile.name : 'Click or drop Question Paper document (PDF / Image)'}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Supports scanned PDF, multi-page exam papers, diagrams, and complex data tables
                </p>
              </div>
            </label>
          </div>

          {/* Interactive Question List */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-200">
                  Parsed Questions ({questions.length})
                </h3>
                {engineUsed && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                    Engine: {engineUsed}
                  </span>
                )}
                {groupByMain && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Grouped: 5 Exam Questions
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Question
              </button>
            </div>

            {questions.map((q, idx) => {
              const hasTable = q.has_table || q.question_text.includes('| --- |') || q.question_text.includes('| :--- |');
              const hasDiagram = q.has_diagram || q.question_text.includes('Diagram Requirement');
              const lineCount = q.question_text.split('\n').length;
              const autoRows = Math.max(3, Math.min(10, lineCount + 1));

              // Compute module & OR choice grouping
              const cleanNum = (q.question_number || '').toString().trim().toLowerCase().replace('question', '').replace('q', '').trim();
              const mNum = cleanNum.match(/^([0-9]+)/);
              const num = mNum ? parseInt(mNum[1], 10) : 1;
              const modIdx = Math.floor((num + 1) / 2);
              const qLow = modIdx * 2 - 1;
              const qHigh = modIdx * 2;
              const modName = `Module ${modIdx}`;
              const mainQ = `Q${num}`;
              const isOptionB = num % 2 === 0;

              const prevClean = idx > 0 ? (questions[idx - 1].question_number || '').toString().trim().toLowerCase().replace('question', '').replace('q', '').trim() : null;
              const prevM = prevClean ? prevClean.match(/^([0-9]+)/) : null;
              const prevNum = prevM ? parseInt(prevM[1], 10) : null;
              const prevModIdx = prevNum ? Math.floor((prevNum + 1) / 2) : null;
              const prevMainQ = prevNum ? `Q${prevNum}` : null;

              const isNewModule = idx === 0 || (prevModIdx !== null && prevModIdx !== modIdx);
              const isChoiceTransition = !isNewModule && prevMainQ !== mainQ && isOptionB;

              return (
                <div key={idx} className="space-y-3">
                  {/* Module Group Banner */}
                  {isNewModule && (
                    <div className="pt-2 pb-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-950/70 via-purple-950/40 to-slate-900 border border-indigo-500/30">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-200">
                            {modName} — Modular Choice
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Q{qLow} OR Q{qHigh}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Students answer <b>Option A (Q{qLow})</b> OR <b>Option B (Q{qHigh})</b> • Best option awarded toward total
                        </span>
                      </div>
                    </div>
                  )}

                  {/* OR Choice Alternative Divider */}
                  {isChoiceTransition && (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-300 border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                        ⚡ OR CHOICE ALTERNATIVE ({mainQ})
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                    </div>
                  )}

                  <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-700 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <input
                            type="text"
                            value={q.question_number}
                            onChange={(e) => handleQuestionChange(idx, 'question_number', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-indigo-300 text-xs font-bold text-center tracking-wide"
                            placeholder="1a"
                          />
                        </div>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          {modName} • {isOptionB ? 'Option B' : 'Option A'} ({mainQ})
                        </span>

                        {hasTable && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            📊 Table Formatted
                          </span>
                        )}

                        {hasDiagram && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                            📐 Neat Diagram Required
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-medium">Max Marks:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={q.max_marks}
                          onChange={(e) => handleQuestionChange(idx, 'max_marks', parseFloat(e.target.value) || 0)}
                          className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs font-bold text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={autoRows}
                      value={q.question_text}
                      onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                      placeholder="Enter full question prompt text..."
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
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
              onClick={() => {
                setStep(3);
                if (examForm.grading_mode === 'rubric_web_validated') {
                  if (webAnswers.length === 0 || webAnswers.length !== questions.length) {
                    handleFetchWebAnswers(questions);
                  }
                }
              }}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {examForm.grading_mode === 'rubric_web_validated' ? `Review Web Search Answers (${questions.length} Questions)` : 'Continue to Rubric & Knowledge'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}


      {/* STEP 3: OPTION 2 - WEB SEARCH ANSWERS & MARK CALIBRATION REVIEW */}
      {step === 3 && examForm.grading_mode === 'rubric_web_validated' && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                  Step 3: Web Search Reference Answers & Mark Calibration Review
                </h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5" /> Option 2: Lenient Web Search
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleFetchWebAnswers(questions)}
                disabled={webAnswersLoading || loading}
                className="px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${webAnswersLoading ? 'animate-spin' : ''}`} />
                {webAnswersLoading ? 'Scanning Web Repositories...' : 'Regenerate All Answers'}
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              AI has queried online academic sources (Wikipedia, DuckDuckGo, academic knowledge bases) to synthesize verified model answers and criteria proportioned to each question's allocated marks. Review each answer below, edit if desired, and click proceed to upload student answer booklets.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Questions</div>
              <div className="text-xl font-bold text-slate-100 mt-0.5">{questions.length} Questions</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Exam Marks</div>
              <div className="text-xl font-bold text-cyan-400 mt-0.5 font-mono">
                {questions.reduce((a, b) => a + (parseFloat(b.max_marks) || 0), 0).toFixed(1)} Marks
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Evaluation Style</div>
              <div className="text-xs font-bold text-emerald-400 mt-1.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Lenient Student-Friendly
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Reference Grounding</div>
              <div className="text-xs font-bold text-indigo-300 mt-1.5 truncate">
                Wikipedia + DuckDuckGo
              </div>
            </div>
          </div>

          {/* Loading Animation Card */}
          {webAnswersLoading && (
            <div className="p-8 rounded-3xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/40 border border-cyan-500/40 text-center space-y-3 animate-pulse">
              <RefreshCw className="w-8 h-8 text-cyan-400 mx-auto animate-spin" />
              <div>
                <h4 className="text-base font-bold text-cyan-200">
                  Scanning Web Knowledge Sources & Synthesizing Mark-Calibrated Answers
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto">
                  Generating definitions, step-by-step algorithms, diagram specifications, and proportional rubrics for {questions.length} questions...
                </p>
              </div>
            </div>
          )}

          {/* List of Question by Question Answer Review Cards */}
          <div className="space-y-6">
            {(webAnswers.length > 0 ? webAnswers : questions).map((qItem, idx) => {
              const matchedWeb = webAnswers.find(w => w.question_number === qItem.question_number) || qItem;
              const qNum = qItem.question_number;
              const qMarks = qItem.max_marks;
              const promptText = qItem.question_text;
              const modelAnswer = matchedWeb.model_answer || qItem.model_answer || '';
              const rItems = (matchedWeb.rubric_items && matchedWeb.rubric_items.length > 0) 
                ? matchedWeb.rubric_items 
                : (qItem.rubric_items || []);
              const citations = matchedWeb.citations || [];
              const rubricSum = rItems.reduce((acc, r) => acc + (parseFloat(r.weight_marks) || 0), 0);
              const isEditing = editingAnswerIdx === idx;
              const isRegenerating = regeneratingIdx === idx;
              const isCopied = copiedAnswerIdx === idx;

              return (
                <div 
                  key={idx} 
                  className="rounded-3xl bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 p-6 space-y-5 transition-all shadow-lg"
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-bold text-sm border border-indigo-500/30">
                        Question {qNum}
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/30 flex items-center gap-1">
                        🎯 Allocated: {qMarks} Marks
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                        Rubric Allocation: <b className="text-emerald-400">{rubricSum.toFixed(1)}M</b> / {qMarks}M
                      </span>
                      {qItem.has_table && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          📊 Table Formatted
                        </span>
                      )}
                      {qItem.has_diagram && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          📐 Diagram Required
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRegenerateSingleAnswer(idx)}
                        disabled={isRegenerating || loading}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Re-query web search and synthesize fresh answer for this question"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingAnswerIdx(isEditing ? null : idx)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isEditing 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                        {isEditing ? 'Done Editing' : 'Edit Answer'}
                      </button>
                    </div>
                  </div>

                  {/* Question Prompt Preview */}
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Question Prompt
                    </div>
                    <p className="text-xs text-slate-200 font-mono leading-relaxed whitespace-pre-wrap">
                      {promptText}
                    </p>
                  </div>

                  {/* Synthesized Reference Model Answer (Calibrated to Marks) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                          Web Reference Model Answer ({qMarks} Marks Depth)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(modelAnswer);
                          setCopiedAnswerIdx(idx);
                          setTimeout(() => setCopiedAnswerIdx(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={8}
                        value={modelAnswer}
                        onChange={(e) => handleUpdateModelAnswer(qNum, e.target.value)}
                        placeholder="Customize model answer text..."
                        className="w-full p-4 bg-slate-950 border border-indigo-500/60 rounded-2xl text-xs font-mono text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      />
                    ) : (
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap max-h-72 overflow-y-auto">
                        {modelAnswer || (
                          <span className="text-slate-500 italic">
                            Click 'Regenerate' or 'Regenerate All Answers' above to fetch model answer from online academic knowledge base.
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Marks-Calibrated Rubric Criteria Breakdown */}
                  {rItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ListChecks className="w-4 h-4 text-emerald-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Proportional Rubric Criteria Breakdown ({rItems.length} items)
                          </h4>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          Sum of Weights: <b className="text-emerald-400">{rubricSum.toFixed(1)}M</b>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {rItems.map((r, rIdx) => (
                          <div 
                            key={rIdx}
                            className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                          >
                            <div className="space-y-0.5">
                              <span className="font-semibold text-slate-200">
                                {r.concept_title}
                              </span>
                              {r.description && r.description !== r.concept_title && (
                                <p className="text-[11px] text-slate-400 leading-tight">
                                  {r.description}
                                </p>
                              )}
                            </div>
                            <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                              {r.weight_marks}M
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Academic Web Sources & Citations */}
                  {citations.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                          Verified Online Academic Sources & Citations ({citations.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {citations.map((c, cIdx) => (
                          <div 
                            key={cIdx}
                            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 truncate">
                                {c.domain || 'academic-source'}
                              </span>
                              {c.source_url && c.source_url !== '#' && (
                                <a
                                  href={c.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium shrink-0"
                                >
                                  View Source <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-xs font-semibold text-slate-200 line-clamp-1">
                              {c.source_title || 'Academic Reference'}
                            </div>
                            {c.evidence_summary && (
                              <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                {c.evidence_summary}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Supplementary Notes Upload Section (Collapsible) */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300">
                  Optional: Attach Supplementary Lecture Slides or Course Notes
                </span>
              </div>
              <label 
                htmlFor="opt2-supp-notes"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
              >
                {knowledgeFile ? knowledgeFile.name : 'Upload Supplementary Notes (PDF/Word)'}
              </label>
              <input
                type="file"
                id="opt2-supp-notes"
                accept=".pdf,.docx,.txt"
                onChange={handleUploadKnowledge}
                className="hidden"
              />
            </div>
            {knowledgeFile && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Supplementary document attached: {knowledgeFile.name}
              </p>
            )}
          </div>

          {/* Action Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 text-xs font-semibold cursor-pointer w-full sm:w-auto text-center"
            >
              ← Back to Question Paper
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleFinalizeSetup('dashboard')}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Save Draft to Dashboard
              </button>

              <button
                type="button"
                onClick={() => handleFinalizeSetup('submissions')}
                disabled={loading}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-emerald-600 to-emerald-500 hover:from-cyan-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-cyan-600/30 cursor-pointer disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Saving Workspace...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    Approve & Proceed to Upload Answer Booklets
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* STEP 3: OPTION 1 - TEACHER NOTES / MARKING RUBRIC SETUP */}
      {step === 3 && examForm.grading_mode === 'notes_grounded' && (
        <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-2xl font-bold text-slate-100">
                Step 3: Upload Teacher Notes or Marking Rubric
              </h2>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Option 1: Moderate Correction
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Upload your course notes, syllabus, or marking rubric. The engine evaluates student submissions using fair, moderate correction.
            </p>
          </div>

          {/* Option 1 Dedicated Banner */}
          <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
              <BookOpen className="w-5 h-5 text-indigo-400 shrink-0" />
              <span>Teacher Notes & Rubric Evaluation (Moderate Correction Mode)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Upload your lecture notes, course slides, or official marking scheme. The AI will evaluate answers with <b>moderate, balanced correction</b> — giving generous partial credit and forgiving slight wording differences without being overly strict.
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

          {/* Extracted Text & Rubric Breakdown Preview */}
          {knowledgeText && (
            <div className="space-y-6">
              {/* Full Extracted Document Preview Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Complete Extracted Reference Document
                    </h4>
                    <span className="text-[11px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                      {knowledgeMeta.charCount.toLocaleString()} chars • {knowledgeMeta.lineCount} lines
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(knowledgeText);
                        setCopiedKnowledge(true);
                        setTimeout(() => setCopiedKnowledge(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKnowledge ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedKnowledge ? 'Copied!' : 'Copy Text'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsExpandedKnowledge(!isExpandedKnowledge)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {isExpandedKnowledge ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpandedKnowledge ? 'Collapse' : 'Expand Full Text'}
                    </button>
                  </div>
                </div>

                <div className={`p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-200 overflow-y-auto whitespace-pre-wrap leading-relaxed transition-all ${
                  isExpandedKnowledge ? 'max-h-[500px]' : 'max-h-64'
                }`}>
                  {knowledgeText}
                </div>
              </div>

              {/* Extracted Rubric Breakdown by Question */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-100">
                        Extracted Question Rubrics & Marking Scheme
                      </h4>
                      <p className="text-xs text-slate-400">
                        Detailed evaluation criteria parsed from scheme and mapped to each question.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    {questions.length} Question(s) Configured
                  </span>
                </div>

                <div className="space-y-3">
                  {questions.map((q, qIdx) => {
                    const rItems = (q.rubric_items && q.rubric_items.length > 0)
                      ? q.rubric_items
                      : (extractedRubrics[q.question_number] || []);

                    const totalRubricMarks = rItems.reduce((acc, r) => acc + (parseFloat(r.weight_marks) || 0), 0);

                    return (
                      <div
                        key={q.id || qIdx}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs">
                              Question {q.question_number}
                            </span>
                            <span className="text-xs font-semibold text-slate-300">
                              Max Marks: {q.max_marks}M
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">
                            Allocated in Rubric: <b className="text-emerald-400">{totalRubricMarks.toFixed(1)}M</b> / {q.max_marks}M
                          </span>
                        </div>

                        {/* Question prompt snippet */}
                        <p className="text-xs text-slate-300 line-clamp-2 italic">
                          "{q.question_text}"
                        </p>

                        {/* Rubric Criteria Items */}
                        {rItems.length > 0 ? (
                          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-indigo-500/40">
                            {rItems.map((item, rIdx) => (
                              <div
                                key={rIdx}
                                className="flex items-start justify-between gap-3 text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800/50"
                              >
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-200">
                                    {item.concept_title}
                                  </span>
                                  {item.description && item.description !== item.concept_title && (
                                    <p className="text-[11px] text-slate-400 leading-tight">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 shrink-0">
                                  {item.weight_marks}M
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                            Standard rubric will be generated from knowledge document upon saving.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer w-full sm:w-auto text-center"
            >
              Back
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleFinalizeSetup('dashboard')}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Save to Dashboard
              </button>
              <button
                type="button"
                onClick={() => handleFinalizeSetup('submissions')}
                disabled={loading}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Save & Proceed to Upload Answer Booklets <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
