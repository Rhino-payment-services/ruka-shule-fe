import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, AdminStats, AdminUser, School, Payment, Student } from './types';

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

  listDeletedStudents: (
    schoolId: string,
    page = 1,
    pageSize = 10,
    search?: string,
    className?: string,
    gender?: string,
  ) =>
    api.get<ApiPaginatedResponse<Student>>('/admin/students/deleted', {
      params: {
        school_id: schoolId,
        page,
        page_size: pageSize,
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(className?.trim() ? { class: className.trim() } : {}),
        ...(gender?.trim() ? { gender: gender.trim() } : {}),
      },
    }),

  restoreStudent: (id: string) =>
    api.post<ApiSuccessResponse<Student>>(`/admin/students/${encodeURIComponent(id)}/restore`),

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
