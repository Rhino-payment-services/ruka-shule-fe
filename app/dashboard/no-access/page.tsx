'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';

export default function NoAccessPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl bg-white px-6 py-10 text-center shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
          <h2 className="text-base font-semibold text-[#08163d]">No pages available</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your school admin has not given this account access to any pages. Ask them to update your permissions, then sign in again.
          </p>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
