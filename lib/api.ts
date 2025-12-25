import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
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
  create: (data: any) => api.post('/schools', data),
};

// Students API
export const studentsAPI = {
  lookup: (params: { student_id?: string; school_code?: string; phone?: string }) =>
    api.get('/students/lookup', { params }),
  list: (page = 1, pageSize = 10) =>
    api.get(`/students?page=${page}&page_size=${pageSize}`),
  create: (data: any) => api.post('/students', data),
  updateClass: (id: string, className: string) =>
    api.patch(`/students/${id}/class`, { class: className }),
};

// Payments API
export const paymentsAPI = {
  initiate: (data: any) => api.post('/payments/initiate', data),
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
  create: (data: any) => api.post('/fees', data),
  createClassFee: (data: any) => api.post('/fees/class', data),
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

