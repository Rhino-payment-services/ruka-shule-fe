'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  phone: string;
  role: 'admin' | 'school_admin' | 'parent';
  school_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

interface RegisterData {
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'school_admin';
  school_id?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored user on mount
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    const { data } = response.data;
    // API returns user data directly in the response
    const userData = {
      id: data.id || data.user?.id,
      email: data.email || data.user?.email,
      phone: data.phone || data.user?.phone,
      role: data.role || data.user?.role,
      school_id: data.school_id || data.user?.school_id,
    };
    const token = data.token;

    setUser(userData as User);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const register = async (data: RegisterData) => {
    const response = await authAPI.register(data);
    const { data: responseData } = response.data;
    // API returns user data directly in the response
    const userData = {
      id: responseData.id || responseData.user?.id,
      email: responseData.email || responseData.user?.email,
      phone: responseData.phone || responseData.user?.phone,
      role: responseData.role || responseData.user?.role,
      school_id: responseData.school_id || responseData.user?.school_id,
    };
    const token = responseData.token;

    setUser(userData as User);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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

