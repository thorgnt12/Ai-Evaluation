import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartgrade_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

export const examsApi = {
  list: () => api.get('/exams'),
  get: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
};

export const questionsApi = {
  uploadQP: (examId, formData) => api.post(`/exams/${examId}/upload-question-paper`, formData),
  uploadKnowledge: (examId, formData) => api.post(`/exams/${examId}/upload-knowledge-document`, formData),
  saveQuestions: (examId, questions) => api.post(`/exams/${examId}/save-questions`, questions),
  updateQuestion: (questionId, data) => api.put(`/questions/${questionId}`, data),
};

export const submissionsApi = {
  bulkUpload: (examId, formData) => api.post(`/exams/${examId}/submissions/bulk-upload`, formData),
  studentUpload: (examId, formData) => api.post(`/exams/${examId}/submissions/student-upload`, formData),
  list: (examId) => api.get(`/exams/${examId}/submissions`),
  get: (submissionId) => api.get(`/submissions/${submissionId}`),
  correctOCRText: (data) => api.post('/submissions/correct-ocr-text', data),
};

export const gradingApi = {
  runGrading: (examId, submissionIds = null) => api.post(`/exams/${examId}/run-grading`, { exam_id: examId, submission_ids: submissionIds }),
};

export const reviewApi = {
  getMatrix: (examId) => api.get(`/exams/${examId}/review-matrix`),
  overrideMark: (evaluationId, data) => api.post(`/evaluations/${evaluationId}/override`, data),
  getAuditLogs: (examId) => api.get(`/exams/${examId}/audit-logs`),
  finalize: (examId, data = {}) => api.post(`/exams/${examId}/finalize`, data),
};

export const analyticsApi = {
  getAnalytics: (examId) => api.get(`/exams/${examId}/analytics`),
  getCalibration: (examId) => api.get(`/exams/${examId}/calibration`),
};

export const reportsApi = {
  getExcelUrl: (examId) => `/api/exams/${examId}/export/excel`,
  getPdfUrl: (submissionId) => `/api/submissions/${submissionId}/export/pdf`,
  sendTestEmail: (examId, teacherEmail) => api.post(`/exams/${examId}/dispatch/test-email?teacher_email=${encodeURIComponent(teacherEmail)}`),
  dispatchBulk: (examId) => api.post(`/exams/${examId}/dispatch/bulk-email`),
};

export const portalApi = {
  listExams: () => api.get('/portal/exams'),
  lookupResult: (data) => api.post('/portal/lookup-result', data),
  submitAnswerSheet: (formData) => api.post('/portal/submit-answer-sheet', formData),
};

export const seedApi = {
  seedDemo: () => api.post('/seed/demo-data'),
};

export default api;
