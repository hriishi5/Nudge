import axios from 'axios';
import { supabase } from './supabaseClient.js';

let rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
rawBaseUrl = rawBaseUrl.trim().replace(/\/+$/, '');
if (!rawBaseUrl.endsWith('/api')) {
  rawBaseUrl += '/api';
}

const apiClient = axios.create({
  baseURL: rawBaseUrl,
  timeout: 30000,
});

// Request Interceptor: Attach Supabase JWT Bearer Token
apiClient.interceptors.request.use(async (config) => {
  try {
    // 1. Check local storage token first (synchronous & reliable)
    let token = localStorage.getItem('nudge_auth_token');

    // 2. If not found in localStorage, check active Supabase session
    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token;
      if (token) {
        localStorage.setItem('nudge_auth_token', token);
      }
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (e) {
    const token = localStorage.getItem('nudge_auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Uniform error message unwrapping and 401 token cleanup
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Clear invalid session tokens on 401
    if (error.response?.status === 401) {
      const isAuthRoute = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
      if (!isAuthRoute) {
        localStorage.removeItem('nudge_auth_token');
        localStorage.removeItem('nudge_user_data');
        localStorage.removeItem('nudge_org_data');
      }
    }

    const message = error.response?.data?.message || error.message || 'Network request failed';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
