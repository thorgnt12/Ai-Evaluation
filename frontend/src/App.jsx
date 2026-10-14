import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

function AppContent() {
  const { user, authLoading } = useAuth();
  const [currentView, setView] = useState('dashboard');
  const [selectedExamId, setSelectedExamId] = useState(null);
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

  const handleExamCreated = (newExamId) => {
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-xl shadow-indigo-500/25 animate-pulse mb-4">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
        <div className="text-sm font-bold tracking-tight text-slate-200">SmartGrade EvalAI</div>
        <div className="text-xs text-slate-500 mt-1">Initializing secure session...</div>
      </div>
    );
  }

  // Active view determination
  // If not logged in and not viewing student portal, show LoginPage
  const effectiveView = !user && currentView !== 'student-portal' ? 'login' : currentView;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative">
      <Navbar 
        currentView={effectiveView} 
        setView={setView} 
        onRefreshExams={handleRefreshExams}
        onShowLogoutToast={() => showToast('Signed out successfully. You can log back in with demo credentials anytime.')}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className="glass-panel px-4 py-3 rounded-2xl border border-indigo-500/40 bg-slate-900/90 text-slate-200 text-xs font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
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
          />
        )}

        {effectiveView === 'wizard' && user && (
          <ExamWizard 
            setView={setView} 
            onExamCreated={handleExamCreated}
          />
        )}

        {effectiveView === 'submissions' && user && selectedExamId && (
          <SubmissionsPage 
            key={`${selectedExamId}-${refreshTrigger}`}
            examId={selectedExamId} 
            setView={setView} 
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
