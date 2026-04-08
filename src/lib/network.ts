const runtimeHost = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';

export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim()) ||
  'https://attendance-ml-api-8sqi.onrender.com';
