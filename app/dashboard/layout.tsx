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
      window.location.replace('/');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label="Loading…" size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label="Redirecting…" size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
