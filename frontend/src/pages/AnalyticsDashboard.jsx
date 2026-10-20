import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, BarChart3, TrendingUp, Award, CheckCircle2, 
  HelpCircle, Target, Sparkles, Activity
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';
import { analyticsApi } from '../api/client';
import { Badge } from '../components/Badge';
import { useTheme } from '../context/ThemeContext';

export const AnalyticsDashboard = ({ examId, setView }) => {
  const { isDark } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [calibration, setCalibration] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const [aRes, cRes] = await Promise.all([
          analyticsApi.getAnalytics(examId),
          analyticsApi.getCalibration(examId)
        ]);
        setAnalytics(aRes.data);
        setCalibration(cRes.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchAnalytics();
  }, [examId]);

  if (loading || !analytics) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
        <div className="text-slate-600 dark:text-slate-400 font-medium text-sm">Loading Analytics Dashboard...</div>
      </div>
    );
  }

  const PIE_COLORS = ['#10b981', '#ef4444'];
  const chartTooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    borderColor: isDark ? '#334155' : '#e2e8f0',
    borderRadius: '12px',
    fontSize: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
    color: isDark ? '#f8fafc' : '#0f172a'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setView('dashboard')}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-xs transition-all w-fit"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          <span>Dashboard</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setView('review')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            Review Matrix
          </button>
          <button
            onClick={() => setView('reports')}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold cursor-pointer shadow-xs transition-all"
          >
            Export Reports
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          Cohort Analytics & Calibration Benchmarks
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {analytics.exam_title} • Comprehensive item analysis, score distributions, and AI vs Teacher calibration.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Class Average</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{analytics.class_average}</div>
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Median Score</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">{analytics.class_median}</div>
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Std Deviation (σ)</div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{analytics.std_deviation}</div>
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pass Rate</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{analytics.pass_percentage}%</div>
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Highest Score</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{analytics.highest_score}</div>
        </div>

        <div className="bg-white dark:bg-slate-850 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Lowest Score</div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{analytics.lowest_score}</div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Cohort Score Distribution (% Buckets)</span>
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="range" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={chartTooltipStyle}
                  itemStyle={{ color: '#4f46e5', fontWeight: 600 }}
                />
                <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass / Fail Donut */}
        <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Pass vs Fail Ratio</span>
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.pass_fail_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analytics.pass_fail_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill || PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            Passing Threshold: <b className="text-slate-800 dark:text-slate-200">{analytics.graded_students > 0 ? `${analytics.pass_percentage}% Passed` : 'N/A'}</b>
          </div>
        </div>
      </div>

      {/* Question Performance & Item Discrimination Analysis */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Question-Level Discrimination Index & Item Analysis</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Discrimination Index (D) measures how well each question distinguishes between top-performing and struggling students.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold">
                <th className="py-3 px-4">Q #</th>
                <th className="py-3 px-4 text-center">Max Marks</th>
                <th className="py-3 px-4 text-center">Class Average</th>
                <th className="py-3 px-4 text-center">Upper Group Avg</th>
                <th className="py-3 px-4 text-center">Lower Group Avg</th>
                <th className="py-3 px-4 text-center">Discrimination Index (D)</th>
                <th className="py-3 px-4 text-right">Quality Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.discrimination_analysis?.map((item) => {
                const isGood = item.discrimination_index >= 0.3;
                return (
                  <tr key={item.question_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {item.question_number}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400">{item.max_marks}M</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100">{item.average_score}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-700 dark:text-emerald-400 font-semibold">{item.upper_group_avg}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-rose-700 dark:text-rose-400 font-semibold">{item.lower_group_avg}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-700 dark:text-indigo-400">
                      {item.discrimination_index}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={isGood ? 'success' : 'warning'} size="sm">
                        {item.quality_label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Calibration Benchmark Suite */}
      {calibration && (
        <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-white dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-slate-900 rounded-3xl p-6 sm:p-8 border border-indigo-200/80 dark:border-indigo-900/60 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>AI vs Teacher Calibration Benchmark Suite</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluates algorithmic alignment, scoring bias, and contradiction detection precision against instructor sample benchmarks.
              </p>
            </div>
            <Badge variant="purple" size="md">
              Sample Size: {calibration.sample_size} Evaluations
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pearson Correlation (r)</div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{calibration.pearson_r}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Target: r ≥ 0.85</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Mean Absolute Error (MAE)</div>
              <div className="text-2xl font-black text-cyan-700 dark:text-cyan-400 mt-1">{calibration.mae} M</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Average point deviation</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Contradiction Precision</div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{calibration.contradiction_precision}%</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">True positive polarity flips</div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 text-center shadow-xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Agreement Rate (±0.5M)</div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{calibration.ai_agreement_rate}%</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Within margin of error</div>
            </div>
          </div>

          <div className="p-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-700 dark:text-slate-300 shadow-xs">
            <span className="font-bold text-indigo-700 dark:text-indigo-400">Interpretation: </span>
            {calibration.interpretation}
          </div>
        </div>
      )}
    </div>
  );
};
