import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, LogIn, Sparkles, CheckCircle2, 
  ExternalLink, AlertCircle, Lock, Mail, Shield
} from 'lucide-react';

export const LoginPage = ({ setView }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shakeError, setShakeError] = useState(false);
  
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 400);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await login(email, password);
      if (result.success) {
        setView('dashboard');
      } else {
        setError(result.message || 'Invalid credentials.');
        setShakeError(true);
        setTimeout(() => setShakeError(false), 400);
      }
    } catch (err) {
      setError('Authentication failed.');
      setShakeError(true);
      setTimeout(() => setShakeError(false), 400);
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
    try {
      let result = await login(demoEmail, demoPassword);
      if (!result.success) {
        result = await login(demoEmail, 'eval2025');
      }
      if (result.success) {
        setView('dashboard');
      } else {
        setError(result.error || 'Demo login failed. Ensure backend is running.');
      }
    } catch (err) {
      setError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Panel - Brand & Info */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col justify-between p-12 xl:p-16 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight">SmartGrade</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/15 text-white/80 border border-white/20">EvalAI</span>
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

        <div className="relative z-10 flex items-center gap-3 text-indigo-200/60 text-xs">
          <Shield className="w-4 h-4" />
          <span>End-to-end encrypted • SOC 2 compliant • Zero-knowledge architecture</span>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-12 lg:px-16 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Brand */}
          <div className="lg:hidden text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 mx-auto mb-3">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800">SmartGrade EvalAI</h2>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to your evaluator account</p>
          </div>

          {/* 1-Click Demo Card */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 mb-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Quick Demo Access
            </div>
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Instantly sign in with pre-configured demo credentials to explore the full platform.
            </p>
            <button
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Signing in...' : 'Sign In with Demo Credentials'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-xs text-slate-400 font-medium">or sign in manually</span>
            </div>
          </div>

          {/* Manual Login Form */}
          <form onSubmit={handleLogin} className={`space-y-4 ${shakeError ? 'animate-shake' : ''}`}>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  placeholder="teacher@smartgrade.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => setView('student-portal')}
            className="w-full text-center text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1.5 py-2 rounded-xl hover:bg-teal-50 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Go to Student Result Portal instead
          </button>
        </div>
      </div>
    </div>
  );
};
