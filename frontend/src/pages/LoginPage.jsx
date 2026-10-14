import React, { useState } from 'react';
import { 
  GraduationCap, Mail, Lock, Eye, EyeOff, Sparkles, 
  ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, 
  Copy, Check, UserCheck, ExternalLink, HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

export const LoginPage = ({ setView }) => {
  const { login, demoLogin, demoCredentials } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shakeError, setShakeError] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [filledFeedback, setFilledFeedback] = useState(false);
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);

  // Trigger celebratory confetti upon successful sign-in
  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981']
      });
    } catch {
      // Confetti fallback
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please provide both email and password.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await login(email, password);
    if (res.success) {
      triggerCelebration();
      if (setView) setView('dashboard');
    } else {
      setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 500);
    }
    setIsSubmitting(false);
  };

  const handle1ClickDemoLogin = async () => {
    setQuickLoggingIn(true);
    setErrorMessage('');
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);

    try {
      const res = await demoLogin();
      if (res.success) {
        triggerCelebration();
        setTimeout(() => {
          if (setView) setView('dashboard');
        }, 350);
      } else {
        setErrorMessage(res.error || 'Demo login failed.');
      }
    } catch {
      setErrorMessage('Network or server error during demo login.');
    } finally {
      setQuickLoggingIn(false);
    }
  };

  const handleAutoFillForm = () => {
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setErrorMessage('');
    setFilledFeedback(true);
    setTimeout(() => setFilledFeedback(false), 2200);
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  return (
    <div className="relative min-h-[92vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      {/* Background Ambience & Lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none animate-float-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none animate-float-glow" style={{ animationDelay: '3s' }} />

      <div className="relative w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* LEFT COLUMN: Brand & Evaluator System Highlights */}
        <div className="lg:col-span-5 space-y-6 text-left hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>SmartGrade EvalAI • Institutional Portal</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Teacher-Controlled <br />
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                AI Exam Assessment
              </span>
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Experience transparent, rubric-grounded grading with full human overrides, OCR ingestion, and instant analytics.
            </p>
          </div>

          {/* Interactive Highlights */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">100% Teacher Authority</div>
                <div className="text-slate-400">One-click score overrides with full audit history for academic integrity.</div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-start gap-3 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-200">Dual Assessment Modes</div>
                <div className="text-slate-400">Notes-grounded strict rubric or AI Web-fact validated marking schemes.</div>
              </div>
            </div>
          </div>

          {/* Student Portal Direct Link */}
          <div className="pt-2">
            <button
              onClick={() => setView('student-portal')}
              className="text-xs font-semibold text-slate-400 hover:text-cyan-400 flex items-center gap-1.5 transition-colors cursor-pointer group"
            >
              <span>Are you a student looking for your exam results?</span>
              <span className="text-cyan-400 group-hover:underline flex items-center">
                Student Portal <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Login & Demo Credentials Card */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* DEMO CREDENTIALS INTERACTIVE CALLOUT CARD */}
          <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-purple-950/60 p-5 shadow-2xl backdrop-blur-xl">
            {/* Top Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  Ready-to-Use Demo Account
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                Teacher / Evaluator
              </span>
            </div>

            {/* Credential Details Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-3.5">
              {/* Email Pill */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Demo Email</div>
                  <div className="text-xs font-mono font-bold text-slate-200 truncate">{demoCredentials.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(demoCredentials.email, 'email')}
                  title="Copy email to clipboard"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Password Pill */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60">
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Demo Password</div>
                  <div className="text-xs font-mono font-bold text-slate-200 truncate">{demoCredentials.password}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(demoCredentials.password, 'password')}
                  title="Copy password to clipboard"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                >
                  {copiedField === 'password' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>              {/* Quick Interactive Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
              <button
                id="quick-demo-login-btn"
                type="button"
                onClick={handle1ClickDemoLogin}
                disabled={quickLoggingIn || isSubmitting}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {quickLoggingIn ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In as Prof. Eleanor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                    <span>1-Click Quick Demo Sign In</span>
                  </>
                )}
              </button>

              <button
                id="autofill-demo-btn"
                type="button"
                onClick={handleAutoFillForm}
                className="w-full sm:w-auto py-2.5 px-3.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {filledFeedback ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Filled!</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Auto-Fill Form</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN LOGIN FORM CARD */}
          <div className="glass-panel rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative">
            {/* Header in Card */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Sign In to Evaluator Portal</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter your instructor credentials or use the demo above
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className={`p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5 mb-5 ${shakeError ? 'animate-shake' : ''}`}>
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={handleAutoFillForm}
                    className="text-[11px] text-rose-200 underline hover:text-white mt-1 cursor-pointer block"
                  >
                    Click to fill demo credentials (teacher@smartgrade.edu / teacher123)
                  </button>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleManualLogin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label htmlFor="login-email-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@smartgrade.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="login-password-input" className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  {capsLockActive && (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      ⚠️ Caps Lock is ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all font-sans placeholder:text-slate-500"
                  />
                  <button
                    id="toggle-password-btn"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/30"
                  />
                  <span>Remember session</span>
                </label>

                <button
                  type="button"
                  onClick={handleAutoFillForm}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
                >
                  Use Demo Login
                </button>
              </div>

              {/* Submit Button */}
              <button
                id="login-submit-btn"
                type="submit"
                disabled={isSubmitting || quickLoggingIn}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Authenticating Evaluator...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Mobile Student Portal Link */}
            <div className="mt-5 pt-4 border-t border-slate-800 text-center lg:hidden">
              <button
                id="goto-student-portal-btn"
                onClick={() => setView('student-portal')}
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Student Result Lookup Portal</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

