import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, LogIn, UserPlus, Sparkles, CheckCircle2, 
  ExternalLink, AlertCircle, Lock, Mail, Shield, User, Eye, EyeOff
} from 'lucide-react';

export const LoginPage = ({ setView }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState('teacher');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shakeError, setShakeError] = useState(false);

  const triggerError = (msg) => {
    setError(msg);
    setShakeError(true);
    setTimeout(() => setShakeError(false), 400);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      triggerError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await login(email, password);
      if (result.success) {
        setView('dashboard');
      } else {
        triggerError(result.error || result.message || 'Invalid email or password.');
      }
    } catch (err) {
      triggerError('Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!regFullName.trim() || regFullName.trim().length < 2) {
      triggerError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      triggerError('Please provide a valid email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      triggerError('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      triggerError('Passwords do not match. Please check and re-type.');
      return;
    }

    setLoading(true);
    try {
      const result = await register(regFullName, regEmail, regPassword, regRole);
      if (result.success) {
        setSuccessMsg(`Welcome, ${regFullName}! Account registered successfully. Redirecting...`);
        setTimeout(() => {
          setView('dashboard');
        }, 800);
      } else {
        triggerError(result.error || 'Registration failed. Email may already be registered.');
      }
    } catch (err) {
      triggerError('Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    const demoEmail = 'teacher@smartgrade.edu';
    const demoPassword = 'teacher123';
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      let result = await login(demoEmail, demoPassword);
      if (!result.success) {
        result = await login(demoEmail, 'eval2025');
      }
      if (result.success) {
        setView('dashboard');
      } else {
        triggerError(result.error || 'Demo login failed. Ensure backend is running.');
      }
    } catch (err) {
      triggerError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white dark:bg-slate-900 transition-colors">
      {/* Left Panel - Brand & Info */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-md">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">SmartGrade</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/15 text-white/90 border border-white/20">EvalAI</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
              Teacher-Controlled<br />
              <span className="text-indigo-200">AI Assessment</span><br />
              Platform
            </h1>
            <p className="text-base text-indigo-200/80 mt-4 max-w-md leading-relaxed">
              Experience transparent, rubric-grounded exam evaluation with complete instructor authority over every mark.
            </p>
          </div>
          
          <div className="space-y-3">
            {[
              'AI evaluations with full teacher override authority',
              'Contradiction detection & factual web verification',
              'Immutable audit trail for every mark change',
              'Instant analytics, reports & student portal'
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span className="text-sm text-indigo-100">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3 text-indigo-200/70 text-xs">
          <Shield className="w-4 h-4" />
          <span>Institutional grade • Full Teacher Authority • Zero-tamper audit logs</span>
        </div>
      </div>

      {/* Right Panel - Login & Registration Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 lg:px-16 py-10 bg-white dark:bg-slate-900 transition-colors">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand */}
          <div className="lg:hidden text-center mb-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-950 mx-auto mb-3">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">SmartGrade EvalAI</h2>
          </div>

          {/* Mode Tabs: Sign In / Register */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <button
              id="tab-signin-btn"
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'register'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Teacher</span>
            </button>
          </div>

          {/* Header Title */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {mode === 'login' ? 'Teacher Sign In' : 'Create Teacher Account'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login' 
                ? 'Sign in to access your assessment workspaces and evaluation tools' 
                : 'Register as an instructor or evaluator to start grading examinations'}
            </p>
          </div>

          {/* 1-Click Demo Card (Always accessible for convenience) */}
          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/80">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span>Pre-Configured Demo Account</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                Instant
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
              Explore with pre-seeded demo exams, sample answer sheets, and dual grading engines.
            </p>
            <button
              id="demo-signin-btn"
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-indigo-950 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Signing in...' : '1-Click Demo Login (teacher@smartgrade.edu)'}</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-slate-900 px-4 text-xs text-slate-400 dark:text-slate-500 font-medium">
                {mode === 'login' ? 'or sign in with credentials' : 'or fill registration details'}
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* -------------------- SIGN IN FORM -------------------- */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className={`space-y-4 ${shakeError ? 'animate-shake' : ''}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="login-email-input"
                    type="email"
                    placeholder="teacher@smartgrade.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-slate-800 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In as Teacher'}</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Don't have an evaluator account?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Register here
                </button>
              </div>
            </form>
          )}

          {/* -------------------- REGISTRATION FORM -------------------- */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className={`space-y-4 ${shakeError ? 'animate-shake' : ''}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name & Title *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="register-fullname-input"
                    type="text"
                    placeholder="Prof. Alan Turing"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Institutional / Work Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="register-email-input"
                    type="email"
                    placeholder="alan.turing@university.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      id="register-password-input"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Min 6 chars"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      id="register-confirm-password-input"
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Academic Role
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="teacher">Instructor / Examiner</option>
                  <option value="evaluator">Chief Evaluator / Moderator</option>
                  <option value="admin">Academic Department Head</option>
                </select>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-indigo-950 transition-all cursor-pointer disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Account...' : 'Complete Teacher Registration'}</span>
              </button>

              <div className="pt-2 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Already have an account?{' '}
                </span>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Sign in here
                </button>
              </div>
            </form>
          )}

          {/* Student Portal Backlink */}
          <button
            id="goto-student-portal-btn"
            onClick={() => setView('student-portal')}
            className="w-full text-center text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-medium flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Go to Student Result Portal instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};
