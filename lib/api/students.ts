import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, Student } from './types';

export const studentsAPI = {
  lookup: (params: { registration_id?: string; school_code?: string; phone?: string }) =>
    api.get<ApiSuccessResponse<Student[]>>('/students/lookup', { params }),

  list: (
    page = 1,
    pageSize = 10,
    schoolId?: string,
    search?: string,
    className?: string,
  ) =>
    api.get<ApiPaginatedResponse<Student>>('/students', {
      params: {
        page,
        page_size: pageSize,
        ...(schoolId ? { school_id: schoolId } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
        ...(className?.trim() ? { class: className.trim() } : {}),
      },
    }),

  get: (id: string) => api.get<ApiSuccessResponse<Student>>(`/students/${id}`),

  create: (data: Record<string, unknown>, schoolId?: string) =>
    api.post<ApiSuccessResponse<Student>>('/students', data, {
      params: schoolId ? { school_id: schoolId } : undefined,
    }),

  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiSuccessResponse<Student>>(`/students/${id}`, data),

  delete: (id: string) => api.delete(`/students/${id}`),

  changeClass: (id: string, className: string) =>
    api.patch<ApiSuccessResponse<Student>>(`/students/${id}/class`, { class: className }),
};
