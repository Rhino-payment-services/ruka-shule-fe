import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    // Always read fresh token from localStorage
    const token = localStorage.getItem('token');
    
    if (token && token.trim() !== '') {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {};
      }
      
      // Set Authorization header - axios should handle this correctly
      const authValue = `Bearer ${token.trim()}`;
      config.headers['Authorization'] = authValue;
      
      // Debug logging for non-auth endpoints
      if (!config.url?.includes('/auth/')) {
        console.log('🔑 Adding token to request:', config.url);
        console.log('  Token length:', token.length);
        console.log('  Token preview:', token.substring(0, 20) + '...');
        console.log('  Full auth header:', authValue.substring(0, 30) + '...');
      }
    } else {
      // Log if token is missing for non-auth endpoints
      if (!config.url?.includes('/auth/')) {
        console.warn('⚠️ No token found for request:', config.url);
        console.warn('  localStorage token:', localStorage.getItem('token') ? 'exists but empty' : 'does not exist');
      }
    }
  }
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// Track failed auth attempts to prevent immediate logout
let authFailureCount = 0;
let lastAuthFailureTime = 0;

// Handle auth errors
api.interceptors.response.use(
  (response) => {
    // Reset failure count on successful response
    authFailureCount = 0;
    return response;
  },
  (error) => {
    // Don't redirect on 401 for login/register endpoints - let them handle their own errors
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    
    if (error.response?.status === 401 && !isAuthEndpoint) {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const now = Date.now();
        const authHeader = error.config?.headers?.Authorization;
        
        // Reset counter if more than 5 seconds have passed
        if (now - lastAuthFailureTime > 5000) {
          authFailureCount = 0;
        }
        
        lastAuthFailureTime = now;
        authFailureCount++;
        
        // Log error details separately to avoid serialization issues
        console.error('❌ 401 Unauthorized Error:');
        console.error('  URL:', error.config?.url || 'unknown');
        console.error('  Has Token:', !!token);
        console.error('  Token Length:', token?.length || 0);
        console.error('  Auth Header:', authHeader ? `${authHeader.substring(0, 30)}...` : 'missing');
        console.error('  Error Message:', error.response?.data?.error || error.message || 'unknown');
        console.error('  Response Status:', error.response?.status);
        console.error('  Response Data:', error.response?.data);
        console.error('  Attempt:', authFailureCount);
        console.error('  Full Error:', error);
        
        if (!token) {
          console.warn('⚠️ 401 error but no token found - might be timing issue');
          // Don't log out if token doesn't exist - might be a race condition
          return Promise.reject(error);
        }
        
        // Only log out after multiple consecutive failures (not just the first one)
        if (authFailureCount >= 3) {
          console.error('🚪 Multiple 401 errors - token may be invalid, logging out');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // Only redirect if not already on login page
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        } else {
          console.warn(`⚠️ 401 Unauthorized (attempt ${authFailureCount}/3) - might be timing issue, not logging out yet`);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; phone: string; password: string; role: string; school_id?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
};

// Schools API
export const schoolsAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get(`/schools?page=${page}&page_size=${pageSize}`),
  get: (id: string) => api.get(`/schools/${id}`),
  create: (data: Record<string, unknown>) => api.post('/schools', data),
};

// Students API
export const studentsAPI = {
  lookup: (params: { student_id?: string; school_code?: string; phone?: string }) =>
    api.get('/students/lookup', { params }),
  list: (page = 1, pageSize = 10) =>
    api.get(`/students?page=${page}&page_size=${pageSize}`),
  create: (data: Record<string, unknown>) => api.post('/students', data),
  updateClass: (id: string, className: string) =>
    api.patch(`/students/${id}/class`, { class: className }),
};

// Payments API
export const paymentsAPI = {
  initiate: (data: Record<string, unknown>) => api.post('/payments/initiate', data),
  getStatus: (reference: string) => api.get(`/payments/status/${reference}`),
  list: (page = 1, pageSize = 10) =>
    api.get(`/payments?page=${page}&page_size=${pageSize}`),
  getSummary: (studentId: string) =>
    api.get(`/payments/student/${studentId}/summary`),
};

// Fees API
export const feesAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get(`/fees?page=${page}&page_size=${pageSize}`),
  listByClass: (className: string, page = 1, pageSize = 10) =>
    api.get(`/fees/class/${className}?page=${page}&page_size=${pageSize}`),
  create: (data: Record<string, unknown>) => api.post('/fees', data),
  createClassFee: (data: Record<string, unknown>) => api.post('/fees/class', data),
};

// Receipts API
export const receiptsAPI = {
  getByReference: (reference: string) => api.get(`/receipts/${reference}`),
};

// SMS API
export const smsAPI = {
  send: (data: { student_id: string; message: string }) =>
    api.post('/sms/send', data),
  getLogs: (page = 1, pageSize = 10) =>
    api.get(`/sms/logs?page=${page}&page_size=${pageSize}`),
};

