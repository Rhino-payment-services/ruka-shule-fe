'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
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
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <LoadingState label="Loading…" size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <LoadingState label="Redirecting…" size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
