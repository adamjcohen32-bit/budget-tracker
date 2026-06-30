import axios from 'axios';

// In production the frontend is served by the backend (same origin), so an
// empty baseURL hits /api on the same host. Locally we point at :3001.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : ''),
});

const TOKEN_KEY = 'bt_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Attach the session token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On auth failure, drop the (stale) token and reload — the gate then shows login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && getToken()) {
      clearToken();
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  status: () => api.get('/api/auth/status').then((r) => r.data),
  login: (password) => api.post('/api/auth/login', { password }).then((r) => r.data),
};

export const settingsApi = {
  get: () => api.get('/api/settings').then(r => r.data),
  update: (data) => api.put('/api/settings', data).then(r => r.data),
};

export const categoriesApi = {
  list: () => api.get('/api/categories').then(r => r.data),
  create: (data) => api.post('/api/categories', data).then(r => r.data),
  update: (id, data) => api.patch(`/api/categories/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/api/categories/${id}`),
};

export const transactionsApi = {
  list: (params) => api.get('/api/transactions', { params }).then(r => r.data),
  create: (data) => api.post('/api/transactions', data).then(r => r.data),
  recategorize: (id, category_id) =>
    api.patch(`/api/transactions/${id}/category`, { category_id }).then(r => r.data),
  setExcluded: (id, excluded) =>
    api.patch(`/api/transactions/${id}/excluded`, { excluded }).then(r => r.data),
  remove: (id) => api.delete(`/api/transactions/${id}`),
};

export const plaidApi = {
  createLinkToken: () => api.post('/api/plaid/create-link-token').then(r => r.data),
  exchangeToken: (public_token) =>
    api.post('/api/plaid/exchange-token', { public_token }).then(r => r.data),
  sync: () => api.post('/api/plaid/sync').then(r => r.data),
};

export const goalsApi = {
  list: () => api.get('/api/goals').then(r => r.data),
  create: (data) => api.post('/api/goals', data).then(r => r.data),
  update: (id, data) => api.patch(`/api/goals/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/api/goals/${id}`),
};
