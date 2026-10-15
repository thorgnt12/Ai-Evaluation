import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
    primary: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30',
    success: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30',
    warning: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30',
    danger: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30',
    purple: 'bg-violet-50 dark:bg-purple-500/10 text-violet-700 dark:text-purple-400 border border-violet-200 dark:border-purple-500/30',
    cyan: 'bg-teal-50 dark:bg-cyan-500/10 text-teal-700 dark:text-cyan-400 border border-teal-200 dark:border-cyan-500/30',
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-full ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.default}`}>
      {children}
    </span>
  );
};

export const OCRBadge = ({ confidence }) => {
  const confVal = typeof confidence === 'number' ? Math.round(confidence) : confidence || 100;
  return (
    <Badge variant="success" size="sm">
      OCR {confVal}%
    </Badge>
  );
};

export const GradingModeBadge = ({ mode }) => {
  if (mode === 'rubric_web_validated' || mode === 'open_web_search' || mode === 'web_search_lenient' || mode === 'option_2') {
    return (
      <Badge variant="cyan" size="sm">
        Option 2: Web Search (Lenient)
      </Badge>
    );
  }
  return (
    <Badge variant="primary" size="sm">
      Option 1: Notes &amp; Rubric (Moderate)
    </Badge>
  );
};
