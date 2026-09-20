'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI } from '@/lib/api';
import { Mail, Phone, MapPin, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { PanelShell, StatusPill, toneFromStatus } from '@/components/data-table';
import { LoadingState } from '@/components/LoadingState';

interface SchoolData {
  id: string;
  name: string;
  code: string;
  address?: string;
  email: string;
  phone: string;
  status: string;
  merchant_id?: string;
  merchant_code?: string;
  business_wallet_id?: string;
  merchant_status?: string;
  created_at: string;
  wallet?: {
    id: string;
    currency: string;
    balance: number;
    wallet_type: string;
    is_active: boolean;
  };
}

export default function SchoolDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [school, setSchool] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSchool();
    }
  }, [id]);

  const loadSchool = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await schoolsAPI.get(id);
      setSchool(response.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to load school');
    } finally {
      setLoading(false);
    }
  };

  const getMerchantStatusBadge = (status?: string) => {
    if (!status) return <StatusPill tone="neutral" dot>Unknown</StatusPill>;
    const map: Record<string, { tone: 'pending' | 'success' | 'danger' | 'neutral'; label: string }> = {
      pending_onboarding: { tone: 'pending', label: 'Pending Onboarding' },
      kyc_submitted: { tone: 'pending', label: 'KYC Submitted' },
      approved: { tone: 'success', label: 'Approved' },
      rejected: { tone: 'danger', label: 'Rejected' },
    };
    const config = map[status] || { tone: 'neutral' as const, label: status };
    return (
      <StatusPill tone={config.tone} dot>
        {config.label}
      </StatusPill>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-24">
            <LoadingState label="Loading school details…" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !school) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
        <div className="space-y-4">
          <PanelShell title="Could not load school">
            <div className="py-8 text-center">
              <p className="font-medium text-red-600">{error || 'School not found'}</p>
              <Button
                variant="outline"
                className="mt-4 h-9 rounded-full border-slate-200"
                onClick={() => router.push('/dashboard/schools')}
              >
                View All Schools
              </Button>
            </div>
          </PanelShell>
        </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            School code: <span className="font-mono font-medium text-[#08163d]">{school.code}</span>
          </p>

          <PanelShell title="School Information" description="Basic details and contact information">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-slate-500">School Name</p>
                  <p className="text-sm font-semibold text-[#08163d]">{school.name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">School Code</p>
                  <p className="font-mono text-sm font-semibold text-[#08163d]">{school.code}</p>
                </div>
                {school.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium text-slate-500">Address</p>
                      <p className="text-sm text-[#08163d]">{school.address}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="text-sm text-[#08163d]">{school.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                  <div>
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <p className="text-sm text-[#08163d]">{school.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Status</p>
                  <StatusPill tone={toneFromStatus(school.status)} dot>
                    {school.status}
                  </StatusPill>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Created</p>
                  <p className="text-sm text-[#08163d]">
                    {school.created_at
                      ? new Date(school.created_at).toLocaleDateString('en-US', {
                          dateStyle: 'medium',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </PanelShell>

          <PanelShell title="Merchant & Wallet" description="Payment integration and wallet information">
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {school.merchant_code && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Merchant Code</p>
                    <p className="font-mono text-sm font-semibold text-[#08163d]">{school.merchant_code}</p>
                  </div>
                )}
                {school.merchant_id && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Merchant ID</p>
                    <p className="break-all font-mono text-sm text-[#08163d]">{school.merchant_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-slate-500">Merchant Status</p>
                  {getMerchantStatusBadge(school.merchant_status)}
                </div>
                {school.business_wallet_id && (
                  <div>
                    <p className="text-xs font-medium text-slate-500">Business Wallet ID</p>
                    <p className="break-all font-mono text-sm text-[#08163d]">{school.business_wallet_id}</p>
                  </div>
                )}
              </div>

              {school.wallet ? (
                <div className="flex items-center gap-4 rounded-2xl bg-[#F8F9FB] p-4 ring-1 ring-black/3">
                  <div className="rounded-full bg-[#08163d]/5 p-3">
                    <Wallet className="h-6 w-6 text-[#08163d]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Wallet Balance</p>
                    <p className="text-xl font-bold text-[#08163d]">
                      {school.wallet.currency}{' '}
                      {school.wallet.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <StatusPill tone={school.wallet.is_active ? 'success' : 'neutral'} dot>
                        {school.wallet.is_active ? 'Active' : 'Inactive'}
                      </StatusPill>
                      <span className="text-xs text-slate-500">{school.wallet.wallet_type} Wallet</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200/80">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Wallet not available</p>
                    <p className="text-xs text-amber-700">
                      {school.merchant_status === 'pending_onboarding'
                        ? 'Merchant onboarding in progress.'
                        : school.merchant_status === 'kyc_submitted'
                        ? 'KYC submitted. Wallet will be available after approval.'
                        : 'Unable to fetch wallet from payment system.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </PanelShell>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
