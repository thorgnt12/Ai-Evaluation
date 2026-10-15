import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = ({ className = '', showLabel = false }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none border shadow-xs ${
        isDark
          ? 'bg-slate-800 hover:bg-slate-700/80 text-amber-300 border-slate-700 hover:border-slate-600 shadow-slate-900/40'
          : 'bg-white hover:bg-slate-100 text-indigo-700 border-slate-200 hover:border-slate-300 shadow-slate-200/50'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label="Toggle theme between Dark and Light"
    >
      <div className="relative flex items-center justify-center w-5 h-5">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-scaleUp transition-transform duration-300 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 animate-scaleUp transition-transform duration-300 hover:-rotate-12" />
        )}
      </div>

      <span className="text-[11px] font-bold tracking-tight">
        {isDark ? 'Dark Theme' : 'Light Theme'}
      </span>

      {/* Mini toggle pill visual */}
      <div
        className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
          isDark ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        <div 
          className="w-3 h-3 rounded-full theme-toggle-knob shadow-xs transition-all duration-200" 
          style={{ backgroundColor: '#ffffff' }}
        />
      </div>
    </button>
  );
};
