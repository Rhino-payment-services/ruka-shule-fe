'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user && typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}
