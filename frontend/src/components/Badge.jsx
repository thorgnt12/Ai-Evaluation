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

export const OCRBadge = ({ confidence, isVerified }) => {
  if (isVerified) {
    return (
      <Badge variant="success" size="sm">
        OCR {confidence}% (Verified)
      </Badge>
    );
  }
  if (confidence >= 85) {
    return (
      <Badge variant="success" size="sm">
        OCR {confidence}%
      </Badge>
    );
  }
  if (confidence >= 70) {
    return (
      <Badge variant="warning" size="sm">
        OCR {confidence}%
      </Badge>
    );
  }
  return (
    <Badge variant="danger" size="sm">
      OCR Flagged ({confidence}%)
    </Badge>
  );
};

export const GradingModeBadge = ({ mode }) => {
  if (mode === 'rubric_web_validated') {
    return (
      <Badge variant="cyan" size="sm">
        Scenario B: Rubric + Web-Validated
      </Badge>
    );
  }
  return (
    <Badge variant="primary" size="sm">
      Scenario A: Notes-Grounded
    </Badge>
  );
};
