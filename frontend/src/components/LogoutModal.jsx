import React, { useEffect } from 'react';
import { LogOut, X, ShieldAlert, CheckCircle, ArrowRight } from 'lucide-react';

export const LogoutModal = ({ isOpen, onClose, onConfirm, user }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const initials = user?.full_name
    ? user.full_name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EV';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-2xl p-6 md:p-8 shadow-2xl border border-rose-100 z-10 space-y-6 text-center transform transition-all duration-300 animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Badge */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 shadow-sm">
          <LogOut className="w-8 h-8 text-rose-500 stroke-[2.2]" />
        </div>

        {/* Title & Body */}
        <div className="space-y-2">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            Sign Out of SmartGrade?
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            You will end your current active evaluator session. Your created exams and student evaluation data remain securely saved in the database.
          </p>
        </div>

        {/* User Card Snapshot */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-700 truncate">
              {user?.full_name || 'Prof. Eleanor Vance'}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {user?.email || 'teacher@smartgrade.edu'}
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200">
            {user?.role || 'Teacher'}
          </span>
        </div>

        {/* Security Assurance Info */}
        <div className="flex items-center gap-2 text-left p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-slate-600">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>You can sign back in anytime using the 1-click demo credentials.</span>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            id="cancel-logout-btn"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
          >
            Stay Signed In
          </button>
          <button
            id="confirm-logout-btn"
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm shadow-rose-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
