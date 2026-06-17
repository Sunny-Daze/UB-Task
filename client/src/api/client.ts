import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const isAuthCall = err?.config?.url?.includes('/auth/');
      if (!isAuthCall) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const getErrorMessage = (err: any): string => {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.message) return err.message;
  return 'Something went wrong';
};
