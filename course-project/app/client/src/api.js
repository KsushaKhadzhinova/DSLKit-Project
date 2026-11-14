import axios from 'axios';
import limits from './limits.json';

export const TOKEN_KEY = 'token';

// The token lives in localStorage so that it survives a reload. Storage can be blocked by the browser, then the user simply has to sign in again.
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const saveToken = (token) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* the session lasts until the page is closed */
  }
};
export const clearToken = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing to remove */
  }
};

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', timeout: 8000 });

// Every request carries the JWT saved after login.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// An expired or rejected token ends the session: the token is removed and the app is told to show the login form.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      clearToken();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

export const register = (email, password) => api.post('/auth/register', { email, password });
export const login = (email, password) => api.post('/auth/login', { email, password });

// The search text, the page size and the offset are query parameters (the server reads ?search=, ?limit= and ?offset=);
// the signal lets the caller cancel the request. The size of the whole list comes back in the X-Total-Count header.
export const fetchDiagrams = (search = '', signal, { limit, offset, tag } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (tag) params.tag = tag;
  if (limit !== undefined) params.limit = limit;
  if (offset) params.offset = offset;
  return withRetry(() => api.get('/diagrams', { params: Object.keys(params).length > 0 ? params : undefined, signal }), signal);
};
// A read is safe to repeat, so it is tried again when the network fails or the server answers 5xx, with a growing pause.
// A 4xx answer or a cancelled request is final: repeating would give the same result or work against the user.
export const retryOptions = { attempts: limits.retry.attempts, delayMs: limits.retry.delayMs };
const isRetryable = (error) => (error.response ? error.response.status >= 500 : !axios.isCancel(error));
const pause = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
    return undefined;
  });
export const withRetry = async (request, signal) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= retryOptions.attempts || !isRetryable(error) || signal?.aborted) throw error;
      await pause(retryOptions.delayMs * attempt, signal);
    }
  }
};

export const addDiagram = (diagram) => api.post('/diagrams', diagram);
export const updateDiagram = (id, diagram) => api.put(`/diagrams/${id}`, diagram);
export const deleteDiagram = (id) => api.delete(`/diagrams/${id}`);

export const fetchProfile = () => api.get('/profile');
export const fetchDiagram = (id, signal) => withRetry(() => api.get(`/diagrams/${id}`, { signal }), signal);

// Comments of one diagram, oldest first; the size of the whole list comes back in X-Total-Count, like for diagrams.
export const fetchComments = (diagramId, signal, { limit, offset } = {}) => {
  const params = {};
  if (limit !== undefined) params.limit = limit;
  if (offset) params.offset = offset;
  return withRetry(() => api.get(`/diagrams/${diagramId}/comments`, { params: Object.keys(params).length > 0 ? params : undefined, signal }), signal);
};
export const addComment = (diagramId, text) => api.post(`/diagrams/${diagramId}/comments`, { text });
export const updateComment = (id, text) => api.patch(`/comments/${id}`, { text });
export const deleteComment = (id) => api.delete(`/comments/${id}`);

// Tags of one diagram (by name, lower case). A tag is created on first use; the server allows changes to the owner and an admin.
export const fetchDiagramTags = (diagramId, signal) => withRetry(() => api.get(`/diagrams/${diagramId}/tags`, { signal }), signal);
export const addDiagramTag = (diagramId, name) => api.post(`/diagrams/${diagramId}/tags`, { name });
export const removeDiagramTag = (diagramId, tagId) => api.delete(`/diagrams/${diagramId}/tags/${tagId}`);

// Administration: the same endpoints that an admin used from a REST client before.
export const fetchUsers = (signal) => withRetry(() => api.get('/users', { signal }), signal);
export const setUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });
export const deleteUser = (id) => api.delete(`/users/${id}`);

export const isCanceled = (error) => axios.isCancel(error);

// A text for the user: the server message when there is one, a clear text when the server is unreachable.
// The text is shown by React as plain text, so markup in a server message cannot run.
export const errorMessage = (error) => {
  if (error.response) {
    const data = error.response.data;
    const { error: message, details } = data && typeof data === 'object' ? data : {};
    const extra = Array.isArray(details) ? details.map((d) => `${d.field}: ${d.message}`).join(', ') : '';
    return [typeof message === 'string' && message ? message : `Ошибка сервера (${error.response.status})`, extra].filter(Boolean).join(' – ');
  }
  if (error.code === 'ECONNABORTED') return 'Сервер не ответил вовремя';
  return 'Сервер недоступен. Проверьте, что он запущен';
};

export default api;
