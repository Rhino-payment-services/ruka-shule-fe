import axios, { AxiosRequestHeaders, InternalAxiosRequestConfig } from 'axios';

// Direct backend URL — set NEXT_PUBLIC_API_URL in each environment.
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface PublicSchoolLookupResponse {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  merchant_id?: string;
  merchant_code?: string;
  business_wallet_id?: string;
  merchant_status?: string;
  status?: string;
  created_at?: string;
  wallet?: {
    id: string;
    currency: string;
    balance: number;
    wallet_type: string;
    is_active: boolean;
  };
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = api
      .post('/auth/refresh')
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function clearClientSessionAndGoHome() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
}

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
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

export const authAPI = {
  register: (data: {
    email: string;
    phone: string;
    password: string;
    role: string;
    school_id?: string;
    first_name?: string;
    last_name?: string;
  }) => api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  checkPhone: (phone: string) =>
    api.get(`/auth/check-phone?phone=${encodeURIComponent(phone)}`),
  checkEmail: (email: string) =>
    api.get(`/auth/check-email?email=${encodeURIComponent(email)}`),
};

export const schoolsAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get(`/schools?page=${page}&page_size=${pageSize}`),
  get: (id: string) => api.get(`/schools/${id}`),
  getMySchool: () => api.get('/schools/me'),
  updateMySchool: (data: Record<string, unknown>) => api.put('/schools/me', data),
  lookup: (identifier: string) =>
    api.get<ApiSuccessResponse<PublicSchoolLookupResponse>>(
      `/schools/lookup?identifier=${encodeURIComponent(identifier)}`,
    ),
  create: (data: Record<string, unknown>) => api.post('/schools', data),
  register: (data: Record<string, unknown>) => api.post('/schools/register', data),
  checkName: (name: string) =>
    api.get(`/schools/check-name?name=${encodeURIComponent(name)}`),
  checkPhone: (phone: string) =>
    api.get(`/schools/check-phone?phone=${encodeURIComponent(phone)}`),
  checkCode: (code: string) =>
    api.get(`/schools/check-code?code=${encodeURIComponent(code)}`),
};

export const studentsAPI = {
  lookup: (params: {
    registration_id?: string;
    school_code?: string;
    phone?: string;
  }) => api.get('/students/lookup', { params }),
  list: (page = 1, pageSize = 10, search?: string) =>
    api.get('/students', { params: { page, page_size: pageSize, search } }),
  get: (id: string) => api.get(`/students/${id}`),
  create: (data: Record<string, unknown>) => api.post('/students', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const paymentsAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get('/payments', { params: { page, page_size: pageSize } }),
  get: (id: string) => api.get(`/payments/${id}`),
  getOverview: (params?: Record<string, unknown>) =>
    api.get('/payments/overview', { params }),
  lookupStudentForPayment: (registrationId: string, schoolCode: string) =>
    api.post('/payments/lookup-student', {
      registration_id: registrationId,
      school_code: schoolCode,
    }),
  processPayment: (data: Record<string, unknown>) => api.post('/payments/process', data),
  getStatus: (reference: string) => api.get(`/payments/status/${reference}`),
  getSummary: (studentId: string) =>
    api.get(`/payments/student/${studentId}/summary`),
  getTermStatus: (studentId: string, academicYear: string, term: string) =>
    api.get(`/payments/student/${studentId}/term`, {
      params: { academic_year: academicYear, term },
    }),
  listByStudent: (studentId: string) => api.get(`/payments/student/${studentId}`),
  listSettlements: (page = 1, pageSize = 10) =>
    api.get('/payments/settlements', { params: { page, page_size: pageSize } }),
  runSettlement: (amount?: number) =>
    api.post('/payments/settlements/run', amount != null ? { amount } : {}),
  retrySettlement: (settlementId: string) =>
    api.post(`/payments/settlements/${settlementId}/retry`),
};

export const feesAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get('/fees', { params: { page, page_size: pageSize } }),
  get: (id: string) => api.get(`/fees/${id}`),
  create: (data: Record<string, unknown>) => api.post('/fees', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/fees/${id}`, data),
  delete: (id: string) => api.delete(`/fees/${id}`),
  getBySchoolAndClass: (schoolId: string, className: string) =>
    api.get('/fees/public', {
      params: { school_id: schoolId, class: className },
    }),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  listUsers: (page = 1, pageSize = 10) =>
    api.get('/admin/users', { params: { page, page_size: pageSize } }),
  listPayments: (page = 1, pageSize = 10) =>
    api.get('/admin/payments', { params: { page, page_size: pageSize } }),
  updateMerchantStatus: (
    schoolId: string,
    data: { merchant_status?: string; status?: string; reason?: string | null },
  ) =>
    api.put(`/admin/schools/${encodeURIComponent(schoolId)}/merchant-status`, {
      merchant_status: data.merchant_status || data.status || '',
      reason: data.reason,
    }),
};
