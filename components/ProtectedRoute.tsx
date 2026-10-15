'use client';

import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from '@/components/LoadingState';
import { firstAccessiblePath } from '@/lib/app-home';
import { hasPermission } from '@/lib/permissions';
import type { UserRole } from '@/lib/api/types';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: string | string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const hasRedirected = useRef(false);

  const allowed = (() => {
    if (!user) return false;
    if (allowedRoles && allowedRoles.length > 0 && allowedRoles.includes(user.role)) return true;
    if (requiredPermission) {
      const codes = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      if (codes.some((code) => hasPermission(user, code))) return true;
    }
    if (!allowedRoles && !requiredPermission) return true;
    return false;
  })();

  useEffect(() => {
    if (loading) return;
    if (hasRedirected.current) return;

    if (!user) {
      hasRedirected.current = true;
      router.replace('/login');
      return;
    }

    if (!allowed) {
      const next = firstAccessiblePath(user);
      if (next !== pathname) {
        hasRedirected.current = true;
        router.replace(next);
      }
    }
  }, [user, loading, allowed, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <LoadingState label="Loading…" size="lg" />
      </div>
    );
  }

  if (!user || !allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F4F5F7]">
        <LoadingState label="Redirecting…" size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}
