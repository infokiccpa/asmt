import axios from 'axios';
import { API_BASE_URL } from '@/config';
import { auth } from './firebase';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Firestore returns `id`, but legacy frontend code uses `_id` — normalise recursively.
function normalizeIds(data: unknown): unknown {
  if (Array.isArray(data)) return data.map(normalizeIds);
  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) result[key] = normalizeIds(obj[key]);
    if (typeof result.id === 'string' && !result._id) result._id = result.id;
    return result;
  }
  return data;
}

// Cached token — Firebase refreshes it every ~hour; we re-use it until it expires
let cachedToken: string | null = null;
let cachedTokenExp = 0;

// Request Interceptor to attach Firebase ID token
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const now = Date.now();
    // Re-fetch token 60 s before expiry to avoid using a stale one
    if (!cachedToken || now >= cachedTokenExp - 60_000) {
      cachedToken = await user.getIdToken();
      // Firebase tokens expire in 1 hour
      cachedTokenExp = now + 60 * 60 * 1000;
    }
    config.headers.Authorization = `Bearer ${cachedToken}`;
  } else if (typeof window !== 'undefined') {
    // Fallback to localStorage if SDK hasn't initialized
    const userString = localStorage.getItem('user');
    if (userString) {
      const parsed = JSON.parse(userString);
      if (parsed.token) config.headers.Authorization = `Bearer ${parsed.token}`;
    }
  }
  return config;
});

// Response Interceptor for handling token expiration
api.interceptors.response.use(
  (response) => {
    if (response.data) response.data = normalizeIds(response.data);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const user = auth.currentUser;
        if (user) {
          // Force refresh Firebase token and bust the local cache
          cachedToken = null;
          const newToken = await user.getIdToken(true);
          cachedToken = newToken;
          cachedTokenExp = Date.now() + 60 * 60 * 1000;
          
          // Update local storage
          const userString = localStorage.getItem('user');
          if (userString) {
            const parsed = JSON.parse(userString);
            parsed.token = newToken;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
           localStorage.removeItem('user');
           window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
