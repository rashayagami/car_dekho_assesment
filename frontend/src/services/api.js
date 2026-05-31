import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s timeout for AI responses
});

// Session APIs
export const createSession = () => api.post('/sessions');

export const getSession = (sessionId) => api.get(`/sessions/${sessionId}`);

export const updateSession = (sessionId, data) =>
  api.patch(`/sessions/${sessionId}`, data);

// Chat / Message APIs
export const getMessages = (sessionId, page = 1, limit = 20) =>
  api.get(`/sessions/${sessionId}/messages`, { params: { page, limit } });

export const sendMessage = (sessionId, data) =>
  api.post(`/sessions/${sessionId}/messages`, data);

export default api;
