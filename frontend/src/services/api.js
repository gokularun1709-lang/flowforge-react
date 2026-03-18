import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('ff_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ff_token');
      localStorage.removeItem('ff_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────
export const login    = d => api.post('/auth/login',    d);
export const register = d => api.post('/auth/register', d);
export const getMe    = ()=> api.get('/auth/me');

// ── Workflows ─────────────────────────────
export const getWorkflows  = p  => api.get('/workflows', { params: p });
export const getWorkflow   = id => api.get(`/workflows/${id}`);
export const createWorkflow= d  => api.post('/workflows', d);
export const updateWorkflow= (id,d) => api.put(`/workflows/${id}`, d);
export const deleteWorkflow= id => api.delete(`/workflows/${id}`);
export const setStartStep  = (id,step_id) => api.put(`/workflows/${id}/start-step`, { step_id });

// ── Steps ─────────────────────────────────
export const getSteps   = wid    => api.get(`/workflows/${wid}/steps`);
export const addStep    = (wid,d)=> api.post(`/workflows/${wid}/steps`, d);
export const updateStep = (id,d) => api.put(`/steps/${id}`, d);
export const deleteStep = id     => api.delete(`/steps/${id}`);

// ── Rules ─────────────────────────────────
export const getRules       = sid    => api.get(`/steps/${sid}/rules`);
export const addRule        = (sid,d)=> api.post(`/steps/${sid}/rules`, d);
export const updateRule     = (id,d) => api.put(`/rules/${id}`, d);
export const deleteRule     = id     => api.delete(`/rules/${id}`);
export const validateRule   = d      => api.post('/rules/validate', d);

// ── Executions ────────────────────────────
export const executeWorkflow = (wid,d)=> api.post(`/workflows/${wid}/execute`, d);
export const getExecutions   = p      => api.get('/executions', { params: p });
export const getExecution    = id     => api.get(`/executions/${id}`);
export const cancelExecution = id     => api.post(`/executions/${id}/cancel`);
export const retryExecution  = id     => api.post(`/executions/${id}/retry`);
export const getStats        = ()     => api.get('/executions/stats');

export default api;
