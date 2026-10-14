import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const variantClasses = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    primary: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
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
      Option 1: Notes & Rubric (Moderate)
    </Badge>
  );
};
