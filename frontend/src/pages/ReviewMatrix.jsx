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
    return <div className="p-12 text-center text-slate-400">Loading Teacher Review Matrix...</div>;
  }

  const isFinalized = matrixData?.status === 'finalized';

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setView('dashboard')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-slate-100 flex items-center gap-2 text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('analytics')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
            Class Analytics
          </button>

          <button
            onClick={() => setView('reports')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Reports & Dispatch
          </button>

          {!isFinalized ? (
            <button
              onClick={() => setFinalizeModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve & Finalize Marks
            </button>
          ) : (
            <Badge variant="success" size="lg">
              <Lock className="w-3.5 h-3.5 mr-1" /> Finalized & Published
            </Badge>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GradingModeBadge mode={matrixData?.grading_mode} />
            <span className="text-xs text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
              {matrixData?.exam_code}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 mt-1">
            Teacher Grade Review Matrix & Overrides
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Inspect individual question evaluations, verify evidence, override marks with mandatory rationale, and maintain an immutable audit trail.
          </p>
        </div>

        {/* Matrix Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Review Grid ({matrixData?.students?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Ledger ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: REVIEW MATRIX GRID */}
      {activeTab === 'matrix' && (
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tip: Click on any score cell to open the detailed Score Inspector & override marks.</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Overridden Mark
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Contradiction Alert
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Web Evidence (Scenario B)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-28">Roll No</th>
                  <th className="py-3 px-4 w-44">Student Name</th>
                  {matrixData?.questions?.map((q) => (
                    <th key={q.id} className="py-3 px-4 text-center">
                      <div className="font-bold text-slate-200">{q.question_number}</div>
                      <div className="text-[10px] text-slate-400 font-normal">Max {q.max_marks}M</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center w-24">Total</th>
                  <th className="py-3 px-4 text-center w-24">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {matrixData?.students?.map((student) => {
                  const isOcrFlagged = student.ocr_confidence < 70 && !student.is_ocr_verified;
                  return (
                    <tr key={student.submission_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                        {student.student_roll}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {student.student_name}
                        {isOcrFlagged && (
                          <span className="block text-[10px] text-amber-400 font-normal">
                            OCR Blocked (&lt;70%)
                          </span>
                        )}
                      </td>

                      {/* Question Cells */}
                      {matrixData?.questions?.map((q) => {
                        const score = student.question_scores[q.id];
                        if (!score || score.evaluation_id === null) {
                          return (
                            <td key={q.id} className="py-3.5 px-4 text-center text-slate-600 font-mono">
                              -
                            </td>
                          );
                        }

                        const hasContra = score.has_contradiction;
                        const hasWeb = score.has_web_evidence;
                        const isOverridden = score.is_overridden;

                        return (
                          <td 
                            key={q.id} 
                            onClick={() => handleCellClick(student, q)}
                            className="py-3.5 px-4 text-center cursor-pointer matrix-cell"
                          >
                            <div className={`py-1.5 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                              isOverridden 
                                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 font-bold'
                                : 'bg-slate-900/90 border-slate-700/60 text-slate-100 hover:border-indigo-500'
                            }`}>
                              <span className="font-mono text-xs font-bold">
                                {score.final_marks}
                              </span>
                              {isOverridden && (
                                <Edit3 className="w-3 h-3 text-amber-400" title="Teacher Overridden" />
                              )}
                              {hasContra && (
                                <ShieldAlert className="w-3 h-3 text-rose-400" title="Contradiction Flagged" />
                              )}
                              {hasWeb && (
                                <Globe className="w-3 h-3 text-cyan-400" title="Web Factual Evidence" />
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Total & Result */}
                      <td className="py-3.5 px-4 text-center font-bold font-mono text-sm text-slate-100">
                        {student.total_marks}
                        <span className="block text-[10px] text-slate-400 font-normal">
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
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              Immutable Audit History Ledger ({auditLogs.length})
            </h3>
            <span className="text-xs text-slate-400">All modifications are permanently recorded</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No manual overrides or modifications logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-4 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        {log.action}
                      </Badge>
                      <span className="font-bold text-slate-200">{log.user_email}</span>
                    </div>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
                    <span>Old Value: <b className="text-slate-400">{log.old_value}</b></span>
                    <span>→</span>
                    <span>New Value: <b className="text-emerald-400">{log.new_value}</b></span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 italic">
                    <span className="font-bold text-slate-400 not-italic">Justification Reason: </span>
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
          <p className="text-xs text-slate-300 leading-relaxed">
            Finalizing marks confirms that you have reviewed all AI evaluations and mark overrides. This will lock the assessment, enable student portal lookups, and allow Excel/PDF report dispatch.
          </p>

          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
            <b>Audit Assurance:</b> A permanent sign-off entry will be written to the audit log.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={() => setFinalizeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleFinalizeExam}
              disabled={finalizing}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {finalizing ? 'Finalizing...' : 'Confirm Final Approval'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
