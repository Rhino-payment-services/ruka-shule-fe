'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  phone: string;
  role: 'admin' | 'school_admin' | 'parent';
  school_id?: string;
  school_code?: string;
  first_name?: string;
  last_name?: string;
}

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

function mapUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.email !== 'string') {
    return null;
  }
  const role = raw.role as User['role'];
  if (!role || !['admin', 'school_admin', 'parent'].includes(role)) {
    return null;
  }
  return {
    id: raw.id,
    email: raw.email,
    phone: (raw.phone as string) || '',
    role,
    school_id: (raw.school_id as string) || undefined,
    first_name: (raw.first_name as string) || undefined,
    last_name: (raw.last_name as string) || undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<boolean> => {
    try {
      const meRes = await authAPI.me();
      const mapped = mapUser(meRes.data?.data);
      if (mapped) {
        setUser(mapped);
        return true;
      }
    } catch {
      // Access may be expired — try refresh cookie once.
      try {
        await authAPI.refresh();
        const meRes = await authAPI.me();
        const mapped = mapUser(meRes.data?.data);
        if (mapped) {
          setUser(mapped);
          return true;
        }
      } catch {
        setUser(null);
        return false;
      }
    }
    setUser(null);
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      // Clear legacy localStorage tokens (pre-cookie auth).
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      if (!cancelled) {
        await refreshUser();
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
    const fromBody = mapUser(authData?.user);
    if (fromBody) {
      setUser(fromBody);
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
    const fromBody = mapUser(authData?.user);
    if (fromBody) {
      setUser(fromBody);
      return;
    }
    const ok = await refreshUser();
    if (!ok) {
      throw new Error('Registration succeeded but session could not be established');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Still clear local session.
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
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
