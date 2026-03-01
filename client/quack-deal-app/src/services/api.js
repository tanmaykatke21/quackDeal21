import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
});

// Auto-inject Firebase token into every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Deals ──────────────────────────────────────────────────
export const getDeals         = ()         => api.get('/api/deals');
export const getDeal          = (id)       => api.get(`/api/deals/${id}`);
export const createDeal       = (data)     => api.post('/api/deals', data);
export const updateOutcome    = (id, outcome) => api.patch(`/api/deals/${id}/outcome`, { outcome });

// ── Analysis ───────────────────────────────────────────────
export const analyzeText = (dealId, text, stage) =>
  api.post('/api/analyze', { dealId, inputType: 'text', transcriptText: text, stage });

export const analyzeFile = (dealId, file, inputType) => {
  const form = new FormData();
  form.append('dealId', dealId);
  form.append('inputType', inputType);
  form.append('file', file);
  return api.post('/api/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const generateFollowUp = (data) => api.post('/api/analyze/followup', data);

// ── Analytics ──────────────────────────────────────────────
export const getAnalytics     = ()     => api.get('/api/analytics/summary');
export const triggerPipeline  = ()     => api.post('/api/analytics/pipeline');

export default api;
