import { api } from './client';
import type {
  ApiSuccessResponse,
  ApiPaginatedResponse,
  Payment,
  PaymentSummary,
  TermPaymentStatus,
  StudentLookupResponse,
  Settlement,
  SettlementsResponse,
} from './types';

export const paymentsAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<Payment>>('/payments', {
      params: { page, page_size: pageSize },
    }),

  get: (id: string) => api.get<ApiSuccessResponse<Payment>>(`/payments/${id}`),

  getOverview: (params?: Record<string, unknown>) =>
    api.get('/payments/overview', { params }),

  lookupStudentForPayment: (registrationId: string, schoolCode: string) =>
    api.post<ApiSuccessResponse<StudentLookupResponse>>('/payments/lookup-student', {
      registration_id: registrationId,
      school_code: schoolCode,
    }),

  processPayment: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<Payment>>('/payments/process', data),

  getStatus: (reference: string) =>
    api.get<ApiSuccessResponse<{ reference: string; status: string; amount: number; currency: string; paid_at?: string; school_code?: string; school_name?: string }>>(
      `/payments/status/${reference}`,
    ),

  getSummary: (studentId: string) =>
    api.get<ApiSuccessResponse<PaymentSummary>>(`/payments/student/${studentId}/summary`),

  getTermStatus: (studentId: string, academicYear: string, term: string) =>
    api.get<ApiSuccessResponse<TermPaymentStatus>>(`/payments/student/${studentId}/term`, {
      params: { academic_year: academicYear, term },
    }),

  listByStudent: (studentId: string, page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<Payment>>(`/payments/student/${studentId}`, {
      params: { page, page_size: pageSize },
    }),

  // Returns a custom envelope: { settlements, summary, page, total_pages }
  listSettlements: (page = 1, pageSize = 10) =>
    api.get<ApiSuccessResponse<SettlementsResponse>>('/payments/settlements', {
      params: { page, page_size: pageSize },
    }),

  runSettlement: (amount?: number) =>
    api.post<ApiSuccessResponse<Settlement>>(
      '/payments/settlements/run',
      amount != null ? { amount } : {},
    ),

  retrySettlement: (settlementId: string) =>
    api.post<ApiSuccessResponse<Settlement>>(`/payments/settlements/${settlementId}/retry`),
};
