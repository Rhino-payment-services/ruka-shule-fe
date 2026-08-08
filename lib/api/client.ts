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
  /** Persisted profile from login — used when /auth/me is missing on older API builds. */
  getCachedUser: (): unknown | null => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('shule_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  },
  setCachedUser: (user: unknown) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('shule_user', JSON.stringify(user));
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('shule_user');
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
/** Set when the last refresh attempt failed because the route is missing (older API). */
let lastRefreshWasMissing = false;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      lastRefreshWasMissing = false;
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) return false;
      try {
        const res = await api.post('/auth/refresh', { refresh_token: refreshToken });
        const data = res.data?.data;
        if (data?.token && data?.refresh_token) {
          tokenStore.set(data.token, data.refresh_token);
          return true;
        }
        if (data?.token) {
          tokenStore.set(data.token, refreshToken);
          return true;
        }
        return false;
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          lastRefreshWasMissing = true;
        }
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
      // Older API without /auth/refresh: don't force logout on a single 401 —
      // AuthContext keeps the login user; the failing call still rejects.
      if (lastRefreshWasMissing) {
        return Promise.reject(error);
      }
      clearClientSessionAndGoHome();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('shule:auth-logout'));
      }
    }

    return Promise.reject(error);
  },
);
