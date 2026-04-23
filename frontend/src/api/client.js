import axios from 'axios';

// Injected by ToastProvider at app startup (F06)
let _toastError = null;
export const registerToastError = (fn) => { _toastError = fn; };

const client = axios.create({ baseURL: 'http://localhost:3001/api' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('rr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.error || 'Something went wrong';
    // 401 triggers auth modal — don't toast it
    if (_toastError && status !== 401) _toastError(message);
    return Promise.reject(err);
  }
);

export default client;
