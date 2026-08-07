import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, Student } from './types';

export const studentsAPI = {
  // Returns a single student or an array depending on the query params used
  lookup: (params: { registration_id?: string; school_code?: string; phone?: string }) =>
    api.get<ApiSuccessResponse<Student[]>>('/students/lookup', { params }),

  list: (page = 1, pageSize = 10, search?: string) =>
    api.get<ApiPaginatedResponse<Student>>('/students', {
      params: { page, page_size: pageSize, search },
    }),

  get: (id: string) => api.get<ApiSuccessResponse<Student>>(`/students/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<Student>>('/students', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiSuccessResponse<Student>>(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),
};
