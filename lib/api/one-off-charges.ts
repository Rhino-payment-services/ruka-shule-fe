import { api } from './client';
import type { ApiSuccessResponse, ApiPaginatedResponse } from './types';

export interface OneOffCharge {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  class?: string | null;
  gender?: string | null;
  status: string;
  school_id: string;
  created_at: string;
}

export interface StudentOneOffCharge {
  id: string;
  one_off_charge_id: string;
  charge_name: string;
  student_id: string;
  student_name?: string;
  registration_id?: string;
  gender?: string;
  amount: number;
  currency: string;
  status: string;
  payment_id?: string;
  paid_at?: string;
  payment_note?: string;
  external_ref?: string;
  payment_reference?: string;
  payment_method?: string;
  created_at: string;
}

export const oneOffChargesAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<OneOffCharge>>('/one-off-charges', {
      params: { page, page_size: pageSize },
    }),
  create: (data: Record<string, unknown>) =>
    api.post<ApiSuccessResponse<OneOffCharge>>('/one-off-charges', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<ApiSuccessResponse<OneOffCharge>>(`/one-off-charges/${id}`, data),
  assign: (id: string, data: { student_ids: string[] }) =>
    api.post<ApiSuccessResponse<StudentOneOffCharge[]>>(`/one-off-charges/${id}/assign`, data),
  listAssignments: (id: string) =>
    api.get<ApiSuccessResponse<StudentOneOffCharge[]>>(`/one-off-charges/${id}/assignments`),
  listForStudent: (studentId: string) =>
    api.get<ApiSuccessResponse<StudentOneOffCharge[]>>(`/students/${studentId}/one-off-charges`),
  waive: (assignmentId: string) =>
    api.post<ApiSuccessResponse<StudentOneOffCharge>>(
      `/one-off-charges/assignments/${assignmentId}/waive`
    ),
  markPaid: (
    assignmentId: string,
    data?: { note?: string; external_ref?: string; method?: string }
  ) =>
    api.post<ApiSuccessResponse<StudentOneOffCharge>>(
      `/one-off-charges/assignments/${assignmentId}/mark-paid`,
      data || {}
    ),
  delete: (id: string) =>
    api.delete<ApiSuccessResponse<{ deleted: boolean }>>(`/one-off-charges/${id}`),
};
