import axios from 'axios';

// Dynamically resolve the API host so the app works over LAN (phone on same WiFi)
// Falls back to localhost for local dev. Override with VITE_API_URL env var.
const API_BASE_URL = import.meta.env.VITE_API_URL
  || `http://${window.location.hostname}:8000/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401 Unauthorized and not already on auth/login, notify listeners
    if (error.response && error.response.status === 401) {
      // Token might be expired or invalid
      console.warn('Unauthorized request. Token may be expired.');
    }
    return Promise.reject(error);
  }
);
