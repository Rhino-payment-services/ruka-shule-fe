import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse, School, PublicSchool } from './types';

export const schoolsAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<School>>(`/schools?page=${page}&page_size=${pageSize}`),

  get: (id: string) => api.get<ApiSuccessResponse<School>>(`/schools/${id}`),

  getMySchool: () => api.get<ApiSuccessResponse<School>>('/schools/me'),

  updateMySchool: (data: Record<string, unknown>) =>
    api.put<ApiSuccessResponse<School>>('/schools/me', data),

  lookup: (identifier: string) =>
    api.get<ApiSuccessResponse<PublicSchool>>(
      `/schools/lookup?identifier=${encodeURIComponent(identifier)}`,
    ),

  create: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<School>>('/schools', data),

  register: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<School>>('/schools/register', data),

  checkName: (name: string) =>
    api.get<ApiSuccessResponse<{ exists: boolean }>>(
      `/schools/check-name?name=${encodeURIComponent(name)}`,
    ),

  checkPhone: (phone: string) =>
    api.get<ApiSuccessResponse<{ exists: boolean }>>(
      `/schools/check-phone?phone=${encodeURIComponent(phone)}`,
    ),

  checkCode: (code: string) =>
    api.get<ApiSuccessResponse<{ exists: boolean }>>(
      `/schools/check-code?code=${encodeURIComponent(code)}`,
    ),
};
