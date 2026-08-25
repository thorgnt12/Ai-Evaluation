import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { ExamWizard } from './pages/ExamWizard';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { GradingConsole } from './pages/GradingConsole';
import { ReviewMatrix } from './pages/ReviewMatrix';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { ReportsPage } from './pages/ReportsPage';
import { StudentPortal } from './pages/StudentPortal';
import { examsApi } from './api/client';

export default function App() {
  const [currentView, setView] = useState('dashboard');
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auto-load first available exam if selectedExamId is not set
  useEffect(() => {
    if (!selectedExamId) {
      examsApi.list().then(res => {
        if (res.data && res.data.length > 0) {
          setSelectedExamId(res.data[0].id);
        }
      }).catch(console.error);
    }
  }, [refreshTrigger, selectedExamId]);

  const handleRefreshExams = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExamCreated = (newExamId) => {
    setSelectedExamId(newExamId);
    handleRefreshExams();
  };

  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar 
          currentView={currentView} 
          setView={setView} 
          onRefreshExams={handleRefreshExams}
        />

        <main className="flex-1 pb-16">
          {currentView === 'dashboard' && (
            <Dashboard 
              key={refreshTrigger}
              setView={setView} 
              setSelectedExamId={setSelectedExamId}
            />
          )}

          {currentView === 'wizard' && (
            <ExamWizard 
              setView={setView} 
              onExamCreated={handleExamCreated}
            />
          )}

          {currentView === 'submissions' && selectedExamId && (
            <SubmissionsPage 
              key={`${selectedExamId}-${refreshTrigger}`}
              examId={selectedExamId} 
              setView={setView} 
            />
          )}

          {currentView === 'grading' && selectedExamId && (
            <GradingConsole 
              key={`${selectedExamId}-${refreshTrigger}`}
              examId={selectedExamId} 
              setView={setView} 
            />
          )}

          {currentView === 'review' && selectedExamId && (
            <ReviewMatrix 
              key={`${selectedExamId}-${refreshTrigger}`}
              examId={selectedExamId} 
              setView={setView} 
            />
          )}

          {currentView === 'analytics' && selectedExamId && (
            <AnalyticsDashboard 
              key={`${selectedExamId}-${refreshTrigger}`}
              examId={selectedExamId} 
              setView={setView} 
            />
          )}

          {currentView === 'reports' && selectedExamId && (
            <ReportsPage 
              key={`${selectedExamId}-${refreshTrigger}`}
              examId={selectedExamId} 
              setView={setView} 
            />
          )}

          {currentView === 'student-portal' && (
            <StudentPortal 
              setView={setView} 
            />
          )}
        </main>
      </div>
    </AuthProvider>
  );
}
