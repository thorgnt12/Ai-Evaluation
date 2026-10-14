import React from 'react';

export const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const variantClasses = {
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
    primary: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    purple: 'bg-violet-50 text-violet-700 border border-violet-200',
    cyan: 'bg-teal-50 text-teal-700 border border-teal-200',
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
