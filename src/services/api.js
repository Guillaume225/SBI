import axios from 'axios';

const api = axios.create({
  baseURL: '/sbi_api/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sbi_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour gérer les erreurs 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Ne pas rediriger si c'est l'appel de login lui-même
      const isLoginCall = url.includes('/auth/login');
      if (!isLoginCall && window.location.pathname !== '/login') {
        localStorage.removeItem('sbi_token');
        localStorage.removeItem('sbi_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
