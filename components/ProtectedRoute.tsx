'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
import { useEffect, useRef } from 'react';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'school_admin' | 'parent')[];
}) {
  const { user, loading } = useAuth();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      hasRedirected.current = true;
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
    }
  }, [user, loading, allowedRoles]);

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

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label="Redirecting…" size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
