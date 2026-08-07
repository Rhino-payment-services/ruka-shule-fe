import axios, { AxiosRequestHeaders, InternalAxiosRequestConfig } from 'axios';

// Direct backend URL — set NEXT_PUBLIC_API_URL in each environment.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Token storage helpers
// ---------------------------------------------------------------------------
export const tokenStore = {
  getAccess: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  getRefresh: (): string | null =>
    typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
  set: (access: string, refresh: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // Clear legacy keys too
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// ---------------------------------------------------------------------------
// Public endpoints — 401 responses here never trigger a token refresh retry
// ---------------------------------------------------------------------------
const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/check-phone',
  '/auth/check-email',
  '/schools/lookup',
  '/schools/check-name',
  '/schools/check-phone',
  '/schools/check-code',
  '/fees/public',
  '/payments/lookup-student',
  '/payments/process',
  '/payments/initiate',
  '/payments/status',
  '/students/lookup',
];

const isPublicEndpoint = (url: string | undefined): boolean => {
  if (!url) return false;
  return publicEndpoints.some((endpoint) => url.includes(endpoint));
};

// ---------------------------------------------------------------------------
// Silent token refresh (singleton promise — prevents parallel refresh races)
// ---------------------------------------------------------------------------
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return false;
      try {
        const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const data = res.data?.data;
        if (data?.token && data?.refresh_token) {
          tokenStore.set(data.token, data.refresh_token);
        }
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearClientSessionAndGoHome() {
  if (typeof window === 'undefined') return;
  tokenStore.clear();
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }
    const accessToken = tokenStore.getAccess();
    if (accessToken && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const url = original?.url as string | undefined;
    const isPublic = isPublicEndpoint(url);

    if (status === 401 && !isPublic && original && !original._retry) {
      original._retry = true;
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        return api(original);
      }
      clearClientSessionAndGoHome();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('shule:auth-logout'));
      }
    }

    return Promise.reject(error);
  },
);
