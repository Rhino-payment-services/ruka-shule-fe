import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, AdminStats, AdminUser, School, Payment } from './types';

export const adminAPI = {
  getStats: () => api.get<ApiSuccessResponse<AdminStats>>('/admin/stats'),

  listUsers: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<AdminUser>>('/admin/users', {
      params: { page, page_size: pageSize },
    }),

  listPayments: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<Payment>>('/admin/payments', {
      params: { page, page_size: pageSize },
    }),

  updateMerchantStatus: (
    schoolId: string,
    data: { merchant_status?: string; status?: string; reason?: string | null },
  ) =>
    api.put<ApiSuccessResponse<School>>(
      `/admin/schools/${encodeURIComponent(schoolId)}/merchant-status`,
      {
        merchant_status: data.merchant_status || data.status || '',
        reason: data.reason,
      },
    ),
};
