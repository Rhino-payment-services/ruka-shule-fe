import { api } from './client';
import type {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PermissionCatalogItem,
  RolePermissions,
  SchoolMember,
} from './types';

export const membersAPI = {
  list: (page = 1, pageSize = 10) =>
    api.get<ApiPaginatedResponse<SchoolMember>>('/schools/me/members', {
      params: { page, page_size: pageSize },
    }),

  create: (data: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    role: string;
    permissions?: string[];
  }) => api.post<ApiSuccessResponse<SchoolMember>>('/schools/me/members', data),

  update: (
    id: string,
    data: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      email?: string;
      role?: string;
      permissions?: string[];
    },
  ) => api.put<ApiSuccessResponse<SchoolMember>>(`/schools/me/members/${encodeURIComponent(id)}`, data),

  deactivate: (id: string) =>
    api.post<ApiSuccessResponse<SchoolMember>>(
      `/schools/me/members/${encodeURIComponent(id)}/deactivate`,
    ),

  activate: (id: string) =>
    api.post<ApiSuccessResponse<SchoolMember>>(
      `/schools/me/members/${encodeURIComponent(id)}/activate`,
    ),

  remove: (id: string) =>
    api.delete<ApiSuccessResponse<{ ok: boolean }>>(`/schools/me/members/${encodeURIComponent(id)}`),

  resendInvitation: (id: string) =>
    api.post<ApiSuccessResponse<SchoolMember>>(
      `/schools/me/members/${encodeURIComponent(id)}/resend-invitation`,
    ),

  catalog: () =>
    api.get<ApiSuccessResponse<PermissionCatalogItem[]>>('/schools/me/permissions'),

  rolePermissions: () =>
    api.get<ApiSuccessResponse<RolePermissions[]>>('/schools/me/role-permissions'),

  updateRolePermissions: (role: string, permissions: string[], applyToExisting = false) =>
    api.put<ApiSuccessResponse<RolePermissions[]>>(
      `/schools/me/role-permissions/${encodeURIComponent(role)}`,
      { permissions, apply_to_existing: applyToExisting },
    ),
};
