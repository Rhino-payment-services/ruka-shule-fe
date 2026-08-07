import { api, tokenStore } from './client';
import type { ApiSuccessResponse, AuthResponse, User } from './types';

export const authAPI = {
  register: (data: {
    email: string;
    phone: string;
    password: string;
    role: string;
    school_id?: string;
    first_name?: string;
    last_name?: string;
  }) => api.post<ApiSuccessResponse<AuthResponse>>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiSuccessResponse<AuthResponse>>('/auth/login', data),

  me: () => api.get<ApiSuccessResponse<User>>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<ApiSuccessResponse<AuthResponse>>('/auth/refresh', {
      refresh_token: refreshToken,
    }),

  /** Reads the stored refresh token automatically — use in AuthContext / interceptors. */
  refreshWithStored: () => {
    const rt = tokenStore.getRefresh();
    return rt
      ? api.post<ApiSuccessResponse<AuthResponse>>('/auth/refresh', { refresh_token: rt })
      : Promise.reject(new Error('no refresh token'));
  },

  logout: (refreshToken?: string) =>
    api.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {}),

  checkPhone: (phone: string) =>
    api.get<ApiSuccessResponse<{ exists: boolean }>>(
      `/auth/check-phone?phone=${encodeURIComponent(phone)}`,
    ),

  checkEmail: (email: string) =>
    api.get<ApiSuccessResponse<{ exists: boolean }>>(
      `/auth/check-email?email=${encodeURIComponent(email)}`,
    ),
};
