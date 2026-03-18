'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'school_admin' | 'parent')[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.push('/login');
      }
      return;
    }
    // Wrong role: redirect to login (NOT /dashboard - that causes infinite loop for parents)
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      hasRedirected.current = true;
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.push('/login');
      }
      return;
    }
  }, [user, loading, router, allowedRoles?.join(',')]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Loading...</div>
      </div>
    );
  }

  // Show redirecting message instead of null - null caused blank screen
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Redirecting...</div>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Redirecting...</div>
      </div>
    );
  }

  return <>{children}</>;
}



