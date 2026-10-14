import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle, 
  History, Sparkles, Lock, BarChart3, FileSpreadsheet,
  Globe, ShieldAlert, Eye, Edit3, CheckCircle2
} from 'lucide-react';
import { reviewApi } from '../api/client';
import { Badge, OCRBadge, GradingModeBadge } from '../components/Badge';
import { ScoreInspector } from '../components/ScoreInspector';
import { Modal } from '../components/Modal';

export const ReviewMatrix = ({ examId, setView }) => {
  const [matrixData, setMatrixData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' or 'audit'
  
  // Score Inspector State
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedScoreData, setSelectedScoreData] = useState(null);

  // Finalize Confirmation Modal
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const [matRes, auditRes] = await Promise.all([
        reviewApi.getMatrix(examId),
        reviewApi.getAuditLogs(examId)
      ]);
      setMatrixData(matRes.data);
      setAuditLogs(auditRes.data);
    } catch (err) {
      console.error('Error loading review matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) fetchMatrix();
  }, [examId]);

  const handleCellClick = (student, question) => {
    const scoreData = student.question_scores[question.id];
    if (!scoreData) return;
    setSelectedStudent(student);
    setSelectedQuestion(question);
    setSelectedScoreData(scoreData);
    setInspectorOpen(true);
  };

  const handleFinalizeExam = async () => {
    setFinalizing(true);
    try {
      await reviewApi.finalize(examId, { notes: 'Exam verified and finalized by course instructor.' });
      setFinalizeModalOpen(false);
      await fetchMatrix();
    } catch (err) {
      alert('Error finalizing exam: ' + (err.response?.data?.detail || err.message));
    } finally {
      setFinalizing(false);
    }
  };

  if (loading && !matrixData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <div className="text-slate-600 font-medium text-sm">Loading Teacher Review Matrix...</div>
      </div>
    );
  }

  const isFinalized = matrixData?.status === 'finalized';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Dashboard</span>
        </button>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setView('analytics')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Class Analytics</span>
          </button>

          <button
            onClick={() => setView('reports')}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Reports & Dispatch</span>
          </button>

          {!isFinalized ? (
            <button
              onClick={() => setFinalizeModalOpen(true)}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve & Finalize Marks</span>
            </button>
          ) : (
            <Badge variant="success" size="lg">
              <Lock className="w-3.5 h-3.5 mr-1" /> Finalized & Published
            </Badge>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <GradingModeBadge mode={matrixData?.grading_mode} />
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-700 font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-medium">
              {matrixData?.exam_code}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1.5 tracking-tight">
            Teacher Grade Review Matrix & Overrides
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Inspect individual question evaluations, verify evidence, override marks with mandatory rationale, and maintain an immutable audit trail.
          </p>
        </div>

        {/* Matrix Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'matrix' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Review Grid ({matrixData?.students?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit Ledger ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: REVIEW MATRIX GRID */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span>Tip: Click on any score cell to open the detailed Score Inspector & override marks.</span>
            <div className="flex items-center gap-4 flex-wrap font-medium">
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Overridden Mark
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Contradiction Alert
              </span>
              <span className="flex items-center gap-1.5 text-cyan-700">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Web Evidence
              </span>
            </div>
          </div>

          {/* Module Choice Policy Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-indigo-900 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md text-[11px] uppercase tracking-wide border border-indigo-200">
                Module Choice Rule
              </span>
              <span className="text-slate-700 font-medium">
                Students answer 1 question per module (e.g. Q1 a,b,c OR Q2 a,b,c). Each module carries <b>max 20 marks</b>. Best option is awarded without exceeding the 20-mark module cap.
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-indigo-800 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 shadow-xs">
              Exam Cap: {matrixData?.total_exam_marks || 50} Marks
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                  <th className="py-3 px-4 w-28">Roll No</th>
                  <th className="py-3 px-4 w-52">Student Name</th>
                  {matrixData?.questions?.map((q) => (
                    <th key={q.id} className="py-3 px-3 text-center min-w-[75px]">
                      {q.module_name && (
                        <div className="text-[9px] uppercase tracking-wider text-indigo-700 font-bold mb-0.5">
                          {q.module_name}
                        </div>
                      )}
                      <div className="font-bold text-slate-900">{q.question_number}</div>
                      <div className="text-[10px] text-slate-500 font-medium">Max {q.max_marks}M</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center w-28">Total</th>
                  <th className="py-3 px-4 text-center w-24">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData?.students?.map((student) => {
                  return (
                    <tr key={student.submission_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {student.student_roll}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        <div className="font-semibold text-slate-900">{student.student_name}</div>
                        {student.module_breakdown && (
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {Object.entries(student.module_breakdown).map(([modName, modInfo]) => (
                              <span
                                key={modName}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 font-mono"
                                title={`${modInfo.choice_group}: Option ${modInfo.selected_option} scored ${modInfo.awarded_marks}/${modInfo.module_max_marks}M`}
                              >
                                {modName}: <b className="text-emerald-700 font-bold">{modInfo.awarded_marks}</b>/{modInfo.module_max_marks}M
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Question Cells */}
                      {matrixData?.questions?.map((q) => {
                        const score = student.question_scores[q.id];
                        if (!score || score.evaluation_id === null) {
                          return (
                            <td key={q.id} className="py-3.5 px-4 text-center text-slate-400 font-mono">
                              -
                            </td>
                          );
                        }

                        const isAttempted = Boolean(score.student_answer && score.student_answer.trim().length > 0);
                        const hasContra = score.has_contradiction;
                        const hasWeb = score.has_web_evidence;
                        const isOverridden = score.is_overridden;

                        return (
                          <td 
                            key={q.id} 
                            onClick={() => handleCellClick(student, q)}
                            className="py-3.5 px-3 text-center cursor-pointer matrix-cell"
                          >
                            <div className={`py-1.5 px-2 rounded-xl border flex items-center justify-center gap-1 transition-all ${
                              isOverridden 
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs'
                                : !isAttempted
                                ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                : score.final_marks > 0
                                ? 'bg-white border-slate-200 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-50/30 font-bold shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 shadow-xs'
                            }`}>
                              <span className="font-mono text-xs">
                                {isAttempted ? (
                                  score.final_marks
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono" title="Optional choice skipped by student">
                                    0
                                  </span>
                                )}
                              </span>
                              {isOverridden && (
                                <Edit3 className="w-3 h-3 text-amber-600" title="Teacher Overridden" />
                              )}
                              {hasContra && (
                                <ShieldAlert className="w-3 h-3 text-rose-600" title="Contradiction Flagged" />
                              )}
                              {hasWeb && (
                                <Globe className="w-3 h-3 text-cyan-600" title="Web Factual Evidence" />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total & Result */}
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-sm text-slate-900">
                        {student.total_marks}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {student.percentage}%
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={student.passed ? 'success' : 'danger'} size="sm">
                          {student.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              <span>Immutable Audit History Ledger ({auditLogs.length})</span>
            </h3>
            <span className="text-xs text-slate-500">All modifications are permanently recorded with cryptographic assurance</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No manual overrides or modifications logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        {log.action}
                      </Badge>
                      <span className="font-bold text-slate-900">{log.user_email}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700 font-mono text-[11px]">
                    <span>Old Value: <b className="text-slate-500">{log.old_value}</b></span>
                    <span>→</span>
                    <span>New Value: <b className="text-emerald-700 font-bold">{log.new_value}</b></span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 italic">
                    <span className="font-bold text-slate-800 not-italic">Justification Reason: </span>
                    "{log.reason}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCORE INSPECTOR DRAWER */}
      <ScoreInspector
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        question={selectedQuestion}
        student={selectedStudent}
        scoreData={selectedScoreData}
        gradingMode={matrixData?.grading_mode}
        onOverrideSaved={async () => {
          setInspectorOpen(false);
          await fetchMatrix();
        }}
      />

      {/* FINALIZE CONFIRMATION MODAL */}
      <Modal
        isOpen={finalizeModalOpen}
        onClose={() => setFinalizeModalOpen(false)}
        title="Approve & Finalize All Exam Results"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Finalizing marks confirms that you have reviewed all AI evaluations and mark overrides. This will lock the assessment, enable student portal lookups, and allow Excel/PDF report dispatch.
          </p>

          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            <b>Audit Assurance:</b> A permanent sign-off entry will be written to the audit log.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              onClick={() => setFinalizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalizeExam}
              disabled={finalizing}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{finalizing ? 'Finalizing...' : 'Confirm Final Approval'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
