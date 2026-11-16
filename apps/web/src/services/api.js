import axios from 'axios';
const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 });
let csrfPromise;
export function resetCsrf() { csrfPromise = undefined; }
async function csrfToken() {
  if (!csrfPromise) csrfPromise = api.get('/auth/csrf').then(response => response.data.csrfToken).catch(error => { resetCsrf(); throw error; });
  return csrfPromise;
}
api.interceptors.request.use(async config => {
  if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) config.headers['X-CSRF-Token'] = await csrfToken();
  return config;
});
api.interceptors.response.use(response => response, error => {
  const url = error.config?.url || '';
  if (error.response?.status === 401 && !['/auth/login', '/auth/session'].includes(url)) window.dispatchEvent(new Event('expenses:unauthorized'));
  if (error.response?.status === 403) resetCsrf();
  return Promise.reject(error);
});
export default api;
