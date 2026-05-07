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
  first_name?: string;
  last_name?: string;
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

// Decode JWT payload without verification (client-side only, for display purposes)
function decodeJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch {
    return null;
  }
}

// Extract user info from JWT claims
function extractUserFromToken(token: string): User | null {
  const claims = decodeJWT(token);
  if (!claims || !claims.user_id || !claims.email) {
    return null;
  }

  return {
    id: claims.user_id,
    email: claims.email,
    phone: claims.phone || '',
    role: claims.role,
    school_id: claims.school_id,
    first_name: claims.first_name,
    last_name: claims.last_name,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount and decode it
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const decodedUser = extractUserFromToken(storedToken);
          if (decodedUser) {
            setUser(decodedUser);
            // Update localStorage user to match decoded token
            localStorage.setItem('user', JSON.stringify(decodedUser));
          }
        } catch (e) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authAPI.login({ email, password });
    console.log('Login response:', response.data);
    
    // Backend now returns: { data: { token: "..." } }
    const authData = response.data.data;
    
    if (!authData || !authData.token) {
      console.error('Invalid response structure:', response.data);
      throw new Error('Invalid response from server');
    }
    
    const token = authData.token;

    // Decode token to get user info
    const userData = extractUserFromToken(token);
    if (!userData) {
      throw new Error('Failed to decode authentication token');
    }

    // Validate role
    if (!userData.role || !['admin', 'school_admin', 'parent'].includes(userData.role)) {
      throw new Error('Invalid user role');
    }

    // Store token and user data
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      const storedToken = localStorage.getItem('token');
      if (storedToken !== token) {
        console.error('Token storage failed!');
        throw new Error('Failed to store authentication token');
      } else {
        console.log('Token stored successfully, length:', token.length);
      }
    }
    
    setUser(userData);
  };

  const register = async (data: RegisterData) => {
    const response = await authAPI.register(data);
    // Backend now returns: { data: { token: "..." } }
    const authData = response.data.data;
    
    if (!authData || !authData.token) {
      throw new Error('Invalid response from server');
    }
    
    const token = authData.token;

    // Decode token to get user info
    const userData = extractUserFromToken(token);
    if (!userData) {
      throw new Error('Failed to decode authentication token');
    }

    // Store token and user data
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    setUser(userData);
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

