import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Users, Sparkles, CheckCircle2, BarChart3, 
  FileSpreadsheet, RefreshCw, ChevronRight
} from 'lucide-react';
import { examsApi } from '../api/client';
import { GradingModeBadge } from './Badge';

export const ExamWorkspaceNav = ({ examId, currentView, setView, onRefresh }) => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (examId) {
      setLoading(true);
      examsApi.get(examId)
        .then(res => {
          if (isMounted) setExam(res.data);
        })
        .catch(err => console.error('Error fetching exam context in ExamWorkspaceNav:', err))
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [examId, currentView]);

  const navItems = [
    {
      id: 'submissions',
      label: 'Submissions & OCR',
      icon: Users,
      badge: exam?.submissions_count !== undefined ? `${exam.submissions_count} Scripts` : null,
      desc: 'Verify text & quality gate'
    },
    {
      id: 'grading',
      label: 'AI Grading Engine',
      icon: Sparkles,
      badge: exam?.status === 'graded' || exam?.status === 'in_review' || exam?.status === 'finalized' ? 'Graded' : 'Ready',
      badgeVariant: exam?.status === 'graded' || exam?.status === 'finalized' ? 'success' : 'default',
      desc: 'Run dual-mode evaluation'
    },
    {
      id: 'review',
      label: 'Review Matrix',
      icon: CheckCircle2,
      badge: exam?.status === 'finalized' ? 'Finalized' : 'Overrides',
      badgeVariant: exam?.status === 'finalized' ? 'success' : 'warning',
      desc: 'Inspect marks & evidence'
    },
    {
      id: 'analytics',
      label: 'Cohort Analytics',
      icon: BarChart3,
      desc: 'Item analysis & distributions'
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: FileSpreadsheet,
      desc: 'XLSX marksheet & email dispatch'
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-2 space-y-3">
        {/* Top Breadcrumb & Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            <button
              onClick={() => setView('dashboard')}
              className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
              title="Return to main dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>All Exams</span>
            </button>
            
            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
            
            <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold">
              {exam?.exam_code || 'EXAM'}
            </span>
            
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md">
              {exam?.title || 'Examination Workspace'}
            </span>

            {exam?.subject && (
              <>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-slate-500 dark:text-slate-400">{exam.subject}</span>
              </>
            )}
          </div>

          {/* Quick Info & Refresh */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {exam?.grading_mode && (
              <GradingModeBadge mode={exam.grading_mode} />
            )}
            {exam?.total_marks && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
                {exam.total_marks}M Max
              </span>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                title="Refresh exam data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* 5-Stage Workspace Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                      isActive
                        ? 'bg-white/20 text-white font-semibold'
                        : item.badgeVariant === 'success'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : item.badgeVariant === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
