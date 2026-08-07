import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, Fee } from './types';

export const feesAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<Fee>>('/fees', { params: { page, page_size: pageSize } }),

  get: (id: string) => api.get<ApiSuccessResponse<Fee>>(`/fees/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<Fee>>('/fees', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiSuccessResponse<Fee>>(`/fees/${id}`, data),

  delete: (id: string) => api.delete(`/fees/${id}`),

  getBySchoolAndClass: (schoolId: string, className: string) =>
    api.get<ApiSuccessResponse<Fee[]>>('/fees/public', {
      params: { school_id: schoolId, class: className },
    }),
};
