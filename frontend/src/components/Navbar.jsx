import React, { useState, useRef, useEffect } from 'react';
import { 
  GraduationCap, LayoutDashboard, PlusCircle, 
  ExternalLink, Sparkles, User, RefreshCw, CheckCircle2,
  LogOut, ChevronDown, LogIn, Shield, Check
} from 'lucide-react';
import { seedApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { LogoutModal } from './LogoutModal';

export const Navbar = ({ currentView, setView, onRefreshExams, onShowLogoutToast }) => {
  const { user, logout } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleConfirmLogout = () => {
    logout();
    setShowLogoutModal(false);
    setDropdownOpen(false);
    if (setView) setView('login');
    if (onShowLogoutToast) onShowLogoutToast();
  };

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EV';

  return (
    <>
      <nav className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <div 
            onClick={() => setView(user ? 'dashboard' : 'login')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-800 tracking-tight">SmartGrade</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200">
                  EvalAI
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Teacher-Controlled AI Assessment</p>
            </div>
          </div>

          {/* Main Nav Links (Active if user is logged in) */}
          {user ? (
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setView('dashboard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  currentView === 'dashboard' 
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </button>

              <button
                onClick={() => setView('wizard')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  currentView === 'wizard' 
                    ? 'bg-white text-indigo-600 shadow-sm font-semibold' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create Exam
              </button>

              <button
                onClick={() => setView('student-portal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  currentView === 'student-portal' 
                    ? 'bg-white text-teal-600 shadow-sm font-semibold' 
                    : 'text-slate-500 hover:text-teal-600 hover:bg-white/60'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Student Portal
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setView('student-portal')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                  currentView === 'student-portal'
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-teal-500" />
                Student Result Portal
              </button>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Seed Demo Button */}
          {user && (
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              title="Seed realistic Scenario A (Notes) and Scenario B (Web Fact Validated) exam samples"
              className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {seeding ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              ) : seedSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              )}
              {seeding ? 'Seeding...' : seedSuccess ? 'Scenarios Seeded!' : 'Seed Demo Data'}
            </button>
          )}

          {/* User Profile Pill or Login Button */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                id="user-profile-menu-btn"
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all cursor-pointer group"
                aria-expanded={dropdownOpen}
              >
                {/* Avatar with Status Pulse */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
                </div>

                {/* Name & Role */}
                <div className="hidden sm:block text-left min-w-[90px]">
                  <div className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors truncate">
                    {user.full_name || 'Prof. Eleanor Vance'}
                  </div>
                  <div className="text-[10px] text-indigo-500 flex items-center gap-1 font-medium">
                    <Shield className="w-2.5 h-2.5 inline" />
                    <span>Evaluator</span>
                  </div>
                </div>

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180 text-slate-600' : ''}`} />
              </button>

              {/* Interactive Dropdown Menu */}
              {dropdownOpen && (
                <div 
                  id="user-dropdown-menu"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fadeIn text-left"
                >
                  {/* Dropdown User Info Card */}
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {user.full_name || 'Prof. Eleanor Vance'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {user.email}
                        </div>
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Active Session
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigation Links in Dropdown */}
                  <div className="p-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setView('dashboard');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <span>Evaluator Dashboard</span>
                    </button>

                    <button
                      onClick={() => {
                        setView('wizard');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4 text-violet-500" />
                      <span>Create New Exam</span>
                    </button>

                    <button
                      onClick={() => {
                        setView('student-portal');
                        setDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4 text-teal-500" />
                      <span>Student Result Portal</span>
                    </button>
                  </div>

                  <div className="my-1 border-t border-slate-100" />

                  {/* Logout Button */}
                  <div className="p-1">
                    <button
                      id="logout-menu-btn"
                      type="button"
                      onClick={() => {
                        setDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-2.5 transition-all cursor-pointer group"
                    >
                      <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="teacher-signin-btn"
                onClick={() => setView('login')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-200 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Teacher Sign In</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Interactive Logout Confirmation Modal */}
      <LogoutModal
        isOpen={showLogoutModal}
        user={user}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};
