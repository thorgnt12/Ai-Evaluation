import React, { useState } from 'react';
import { 
  GraduationCap, LayoutDashboard, PlusCircle, 
  ExternalLink, Sparkles, User, RefreshCw, CheckCircle2
} from 'lucide-react';
import { seedApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ currentView, setView, onRefreshExams }) => {
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedSuccess(false);
    try {
      await seedApi.seedDemo();
      setSeedSuccess(true);
      if (onRefreshExams) onRefreshExams();
      setTimeout(() => setSeedSuccess(false), 3000);
    } catch (err) {
      console.error("Error seeding demo data:", err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center gap-6">
        <div 
          onClick={() => setView('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-slate-100 tracking-tight">SmartGrade</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                EvalAI v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Teacher-Controlled AI Assessment</p>
          </div>
        </div>

        {/* Main Nav Links */}
        <div className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setView('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              currentView === 'dashboard' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>

          <button
            onClick={() => setView('wizard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              currentView === 'wizard' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create Exam
          </button>

          <button
            onClick={() => setView('student-portal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
              currentView === 'student-portal' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Student Result Portal
          </button>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Seed Demo Button */}
        <button
          onClick={handleSeedDemo}
          disabled={seeding}
          title="Seed realistic Scenario A (Notes) and Scenario B (Web Fact Validated) exam samples"
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/80 to-purple-900/80 hover:from-indigo-800 hover:to-purple-800 border border-indigo-500/40 text-indigo-200 text-xs font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {seeding ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
          ) : seedSuccess ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          )}
          {seeding ? 'Seeding Demo Data...' : seedSuccess ? 'Scenarios Seeded!' : 'Seed Demo Scenarios'}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-slate-200">{user?.full_name || 'Instructor'}</div>
            <div className="text-[10px] text-slate-400">Teacher / Admin</div>
          </div>
        </div>
      </div>
    </nav>
  );
};
