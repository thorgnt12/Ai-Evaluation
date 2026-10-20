import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ExamWizard } from './pages/ExamWizard';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { GradingConsole } from './pages/GradingConsole';
import { ReviewMatrix } from './pages/ReviewMatrix';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { ReportsPage } from './pages/ReportsPage';
import { StudentPortal } from './pages/StudentPortal';
import { examsApi } from './api/client';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { ExamWorkspaceNav } from './components/ExamWorkspaceNav';

function AppContent() {
  const { user, authLoading } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [wizardResumeExamId, setWizardResumeExamId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

  // Auto-load first available exam if selectedExamId is not set and user is logged in
  useEffect(() => {
    if (user && !selectedExamId) {
      examsApi.list()
        .then(res => {
          if (res.data && res.data.length > 0) {
            setSelectedExamId(res.data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [user, refreshTrigger, selectedExamId]);

  const handleRefreshExams = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCreateNewExam = () => {
    setWizardResumeExamId(null);
    setView('wizard');
  };

  const handleResumeExam = (examId) => {
    setWizardResumeExamId(examId);
    setSelectedExamId(examId);
    setView('wizard');
  };

  const handleExamCreated = (newExamId) => {
    setWizardResumeExamId(null);
    setSelectedExamId(newExamId);
    handleRefreshExams();
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Initial loading splash
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-800 dark:text-slate-100 transition-colors">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 animate-pulse mb-4">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <div className="text-sm font-bold tracking-tight text-slate-700 dark:text-slate-200">SmartGrade EvalAI</div>
        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">Initializing secure session...</div>
      </div>
    );
  }

  // Active view determination
  // If not logged in and not viewing student portal, show LoginPage
  const effectiveView = !user && currentView !== 'student-portal' ? 'login' : currentView;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col relative transition-colors duration-200" style={{ fontFamily: "var(--font-sans)" }}>
      <Navbar 
        currentView={effectiveView} 
        setView={setView} 
        onCreateExam={handleCreateNewExam}
        onRefreshExams={handleRefreshExams}
        onShowLogoutToast={() => showToast('Signed out successfully. You can log back in with demo credentials anytime.')}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2.5 shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Exam Workspace Context & 5-Stage Module Navigation Bar */}
      {['submissions', 'grading', 'review', 'analytics', 'reports'].includes(effectiveView) && selectedExamId && user && (
        <ExamWorkspaceNav 
          examId={selectedExamId}
          currentView={effectiveView}
          setView={setView}
          onRefresh={handleRefreshExams}
        />
      )}

      <main className="flex-1 pb-16">
        {effectiveView === 'login' && (
          <LoginPage setView={setView} />
        )}

        {effectiveView === 'dashboard' && user && (
          <Dashboard 
            key={refreshTrigger}
            setView={setView} 
            setSelectedExamId={setSelectedExamId}
            onCreateExam={handleCreateNewExam}
            onResumeExam={handleResumeExam}
          />
        )}

        {effectiveView === 'wizard' && user && (
          <ExamWizard 
            key={wizardResumeExamId ? `resume-${wizardResumeExamId}` : 'new-exam'}
            setView={setView} 
            resumeExamId={wizardResumeExamId}
            setSelectedExamId={setSelectedExamId}
            setWizardResumeExamId={setWizardResumeExamId}
            onExamCreated={handleExamCreated}
          />
        )}

        {effectiveView === 'submissions' && user && selectedExamId && (
          <SubmissionsPage 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
            onResumeExam={handleResumeExam}
          />
        )}

        {effectiveView === 'grading' && user && selectedExamId && (
          <GradingConsole 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
          />
        )}

        {effectiveView === 'review' && user && selectedExamId && (
          <ReviewMatrix 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
          />
        )}

        {effectiveView === 'analytics' && user && selectedExamId && (
          <AnalyticsDashboard 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
          />
        )}

        {effectiveView === 'reports' && user && selectedExamId && (
          <ReportsPage 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
          />
        )}

        {effectiveView === 'student-portal' && (
          <StudentPortal 
            setView={setView} 
          />
        )}
      </main>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("SmartGrade UI ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred. Please click below to reload.'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-sm hover:bg-indigo-700 transition-all cursor-pointer"
            >
              Reload Application
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('smartgrade_token');
                localStorage.removeItem('smartgrade_user');
                window.location.href = '/';
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Reset Session
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
