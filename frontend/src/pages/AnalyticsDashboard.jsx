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

export const AnalyticsDashboard = ({ examId, setView }) => {
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
    return <div className="p-12 text-center text-slate-400">Loading Analytics Dashboard...</div>;
  }

  const PIE_COLORS = ['#10b981', '#ef4444'];

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
            onClick={() => setView('review')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Review Matrix
          </button>
          <button
            onClick={() => setView('reports')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Export Reports
          </button>
        </div>
      </div>

      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800">
        <h1 className="text-2xl font-extrabold text-slate-100">
          Cohort Analytics & Calibration Benchmarks
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {analytics.exam_title} • Comprehensive item analysis, score distributions, and AI vs Teacher calibration.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Class Average</div>
          <div className="text-xl font-extrabold text-slate-100 mt-1">{analytics.class_average}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Median Score</div>
          <div className="text-xl font-extrabold text-slate-100 mt-1">{analytics.class_median}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Std Deviation (σ)</div>
          <div className="text-xl font-extrabold text-indigo-400 mt-1">{analytics.std_deviation}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Pass Rate</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1">{analytics.pass_percentage}%</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Highest Score</div>
          <div className="text-xl font-extrabold text-amber-400 mt-1">{analytics.highest_score}</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-[11px] font-semibold uppercase text-slate-400">Lowest Score</div>
          <div className="text-xl font-extrabold text-rose-400 mt-1">{analytics.lowest_score}</div>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Chart */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Cohort Score Distribution (% Buckets)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.score_distribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass / Fail Donut */}
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Pass vs Fail Ratio
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
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-xs text-slate-400 border-t border-slate-800/80 pt-2">
            Passing Threshold: <b>{analytics.graded_students > 0 ? `${analytics.pass_percentage}% Passed` : 'N/A'}</b>
          </div>
        </div>
      </div>

      {/* Question Performance & Item Discrimination Analysis */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-400" />
              Question-Level Discrimination Index & Item Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Discrimination Index (D) measures how well each question distinguishes between top-performing and struggling students.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Q #</th>
                <th className="py-3 px-4 text-center">Max Marks</th>
                <th className="py-3 px-4 text-center">Class Average</th>
                <th className="py-3 px-4 text-center">Upper Group Avg</th>
                <th className="py-3 px-4 text-center">Lower Group Avg</th>
                <th className="py-3 px-4 text-center">Discrimination Index (D)</th>
                <th className="py-3 px-4 text-right">Quality Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {analytics.discrimination_analysis?.map((item) => {
                const isGood = item.discrimination_index >= 0.3;
                return (
                  <tr key={item.question_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {item.question_number}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">{item.max_marks}M</td>
                    <td className="py-3.5 px-4 text-center font-bold text-slate-200">{item.average_score}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-emerald-400">{item.upper_group_avg}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-rose-400">{item.lower_group_avg}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-indigo-300">
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
        <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4 bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                AI vs Teacher Calibration Benchmark Suite
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates algorithmic alignment, scoring bias, and contradiction detection precision against instructor sample benchmarks.
              </p>
            </div>
            <Badge variant="purple" size="md">
              Sample Size: {calibration.sample_size} Evaluations
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Pearson Correlation (r)</div>
              <div className="text-2xl font-black text-indigo-400 mt-1">{calibration.pearson_r}</div>
              <div className="text-[10px] text-slate-400 mt-1">Target: r ≥ 0.85</div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Mean Absolute Error (MAE)</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">{calibration.mae} M</div>
              <div className="text-[10px] text-slate-400 mt-1">Average point deviation</div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Contradiction Precision</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">{calibration.contradiction_precision}%</div>
              <div className="text-[10px] text-slate-400 mt-1">True positive polarity flips</div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
              <div className="text-[11px] font-semibold uppercase text-slate-400">Agreement Rate (±0.5M)</div>
              <div className="text-2xl font-black text-amber-400 mt-1">{calibration.ai_agreement_rate}%</div>
              <div className="text-[10px] text-slate-400 mt-1">Within margin of error</div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 text-xs text-slate-300">
            <span className="font-bold text-indigo-300">Interpretation: </span>
            {calibration.interpretation}
          </div>
        </div>
      )}
    </div>
  );
};
