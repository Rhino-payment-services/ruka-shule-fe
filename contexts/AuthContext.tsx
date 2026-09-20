'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authAPI, tokenStore } from '@/lib/api';
import type { User, UserRole } from '@/lib/api/types';

const VALID_ROLES: UserRole[] = [
  'admin',
  'school_admin',
  'owner',
  'headteacher',
  'bursar',
  'teacher',
  'parent',
];

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<boolean>;
}

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'school_admin';
  school_id?: string;
  first_name?: string;
  last_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(raw: unknown): User | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.email !== 'string') return null;
  const role = r.role as UserRole;
  if (!role || !VALID_ROLES.includes(role)) return null;
  const permissions = Array.isArray(r.permissions)
    ? r.permissions.filter((p): p is string => typeof p === 'string')
    : [];
  return {
    id: r.id,
    email: r.email,
    phone: (r.phone as string) || '',
    role,
    status: (r.status as User['status']) || 'active',
    school_id: (r.school_id as string) || undefined,
    first_name: (r.first_name as string) || undefined,
    last_name: (r.last_name as string) || undefined,
    permissions,
    created_at: typeof r.created_at === 'string' ? r.created_at : '',
  };
}

function httpStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  return (err as { response?: { status?: number } }).response?.status;
}

function persistUser(mapped: User, setUser: (u: User | null) => void) {
  setUser(mapped);
  tokenStore.setCachedUser(mapped);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restoreFromLoginCache = useCallback((): boolean => {
    if (!tokenStore.getAccess()) return false;
    const mapped = mapUser(tokenStore.getCachedUser());
    if (!mapped) return false;
    setUser(mapped);
    return true;
  }, []);

  const refreshUser = useCallback(async (): Promise<boolean> => {
    try {
      const meRes = await authAPI.me();
      const mapped = mapUser(meRes.data?.data);
      if (mapped) {
        persistUser(mapped, setUser);
        return true;
      }
    } catch (meErr) {
      if (httpStatus(meErr) === 404 && restoreFromLoginCache()) {
        return true;
      }

      try {
        const refreshRes = await authAPI.refreshWithStored();
        const refreshData = refreshRes.data?.data;
        if (refreshData?.token && refreshData?.refresh_token) {
          tokenStore.set(refreshData.token, refreshData.refresh_token);
        }
        const fromRefresh = mapUser(refreshData?.user);
        if (fromRefresh) {
          persistUser(fromRefresh, setUser);
          return true;
        }
        const meRes = await authAPI.me();
        const mapped = mapUser(meRes.data?.data);
        if (mapped) {
          persistUser(mapped, setUser);
          return true;
        }
      } catch (refreshErr) {
        if (
          (httpStatus(refreshErr) === 404 || httpStatus(meErr) === 404) &&
          restoreFromLoginCache()
        ) {
          return true;
        }
        setUser(null);
        tokenStore.clear();
        return false;
      }
    }

    if (restoreFromLoginCache()) return true;
    setUser(null);
    return false;
  }, [restoreFromLoginCache]);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (!cancelled) {
        if (tokenStore.getAccess() || tokenStore.getRefresh()) {
          await refreshUser();
        }
        setLoading(false);
      }
    };

    boot();

    const onLogout = () => setUser(null);
    if (typeof window !== 'undefined') {
      window.addEventListener('shule:auth-logout', onLogout);
    }
    return () => {
      cancelled = true;
      if (typeof window !== 'undefined') {
        window.removeEventListener('shule:auth-logout', onLogout);
      }
    };
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    const authData = response.data?.data;
    if (authData?.token && authData?.refresh_token) {
      tokenStore.set(authData.token, authData.refresh_token);
    } else if (authData?.token) {
      tokenStore.set(authData.token, authData.refresh_token || authData.token);
    }
    const fromBody = mapUser(authData?.user);
    if (fromBody) {
      persistUser(fromBody, setUser);
      return;
    }
    const ok = await refreshUser();
    if (!ok) {
      throw new Error('Login succeeded but session could not be established');
    }
  };

  const register = async (data: RegisterData) => {
    const response = await authAPI.register(data);
    const authData = response.data?.data;
    if (authData?.token && authData?.refresh_token) {
      tokenStore.set(authData.token, authData.refresh_token);
    } else if (authData?.token) {
      tokenStore.set(authData.token, authData.refresh_token || authData.token);
    }
    const fromBody = mapUser(authData?.user);
    if (fromBody) {
      persistUser(fromBody, setUser);
      return;
    }
    const ok = await refreshUser();
    if (!ok) {
      throw new Error('Registration succeeded but session could not be established');
    }
  };

  const logout = async () => {
    try {
      const refreshToken = tokenStore.getRefresh();
      await authAPI.logout(refreshToken ?? undefined);
    } catch {
      // Still clear local session even if the revocation call fails.
    }
    setUser(null);
    tokenStore.clear();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
