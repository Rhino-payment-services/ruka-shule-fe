'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  phone: string;
  role: 'admin' | 'school_admin' | 'parent';
  school_id?: string;
  school_code?: string;
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
    console.log('Login response:', response.data);
    
    // Backend returns: { data: { token: "...", user: { ... } } }
    const authData = response.data.data;
    
    if (!authData || !authData.token || !authData.user) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Invalid response from server');
    }
    
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
      role: authData.user.role,
      school_id: authData.user.school_id,
      school_code: authData.user.school_code,
    };
    const token = authData.token;

    // Validate role
    if (!userData.role || !['admin', 'school_admin', 'parent'].includes(userData.role)) {
      throw new Error('Invalid user role');
    }

    // Store token and user data FIRST, before setting state
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      // Verify token was stored
      const storedToken = localStorage.getItem('token');
      if (storedToken !== token) {
        console.error('Token storage failed!');
        throw new Error('Failed to store authentication token');
      } else {
        console.log('Token stored successfully, length:', token.length, 'First 20 chars:', token.substring(0, 20));
      }
    }
    
    setUser(userData as User);
  };

  const register = async (data: RegisterData) => {
    const response = await authAPI.register(data);
    // Backend returns: { data: { token: "...", user: { ... } } }
    const authData = response.data.data;
    
    if (!authData || !authData.token || !authData.user) {
      throw new Error('Invalid response from server');
    }
    
    const userData = {
      id: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
      role: authData.user.role,
      school_id: authData.user.school_id,
      school_code: authData.user.school_code,
    };
    const token = authData.token;

    // Store token and user data FIRST, before setting state
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      // Force a small delay to ensure localStorage is written
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setUser(userData as User);
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

