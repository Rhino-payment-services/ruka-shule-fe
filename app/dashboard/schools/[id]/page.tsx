'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI } from '@/lib/api';
import { School, Mail, Phone, MapPin, Wallet, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
      console.error('Failed to load school:', err);
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to load school');
    } finally {
      setLoading(false);
    }
  };

  const getMerchantStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    const map: Record<string, { className: string; label: string }> = {
      pending_onboarding: {
        className: 'bg-orange-100 text-orange-700 border-orange-300',
        label: 'Pending Onboarding',
      },
      kyc_submitted: {
        className: 'bg-amber-100 text-amber-700 border-amber-300',
        label: 'KYC Submitted',
      },
      approved: {
        className: 'bg-green-100 text-green-700 border-green-300',
        label: 'Approved',
      },
      rejected: {
        className: 'bg-red-100 text-red-700 border-red-300',
        label: 'Rejected',
      },
    };
    const config = map[status] || { className: 'bg-gray-100 text-gray-700', label: status };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
          <div className="flex items-center justify-center py-24">
            <div className="text-muted-foreground">Loading school details...</div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (error || !school) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
        <div className="space-y-6">
          <Card className="border-red-200">
              <CardContent className="py-12 text-center">
                <p className="text-destructive font-medium">{error || 'School not found'}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/dashboard/schools')}
                >
                  View All Schools
                </Button>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">
                {school.name}
              </h1>
              <p className="mt-2 text-muted-foreground">
                School code: <span className="font-mono font-medium">{school.code}</span>
              </p>
            </div>
          </div>

          {/* School Information */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                School Information
              </CardTitle>
              <CardDescription>Basic details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">School Name</p>
                  <p className="text-lg font-semibold">{school.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">School Code</p>
                  <p className="font-mono font-semibold">{school.code}</p>
                </div>
                {school.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address</p>
                      <p>{school.address}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{school.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p>{school.phone}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      school.status === 'active'
                        ? 'bg-green-100 text-green-700 border-green-300'
                        : 'bg-gray-100 text-gray-700 border-gray-300'
                    }
                  >
                    {school.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {school.created_at
                      ? new Date(school.created_at).toLocaleDateString('en-US', {
                          dateStyle: 'medium',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merchant & Wallet */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-blue-600" />
                Merchant & Wallet
              </CardTitle>
              <CardDescription>
                Payment integration and wallet information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {school.merchant_code && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Merchant Code
                    </p>
                    <p className="font-mono font-semibold">{school.merchant_code}</p>
                  </div>
                )}
                {school.merchant_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Merchant ID
                    </p>
                    <p className="font-mono text-sm break-all">{school.merchant_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Merchant Status
                  </p>
                  {getMerchantStatusBadge(school.merchant_status)}
                </div>
                {school.business_wallet_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Business Wallet ID
                    </p>
                    <p className="font-mono text-sm break-all">
                      {school.business_wallet_id}
                    </p>
                  </div>
                )}
              </div>

              {school.wallet ? (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-emerald-50 border-2 border-emerald-200">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <Wallet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900">Wallet Balance</p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {school.wallet.currency}{' '}
                      {school.wallet.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        className={
                          school.wallet.is_active
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-500'
                        }
                      >
                        {school.wallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-emerald-600">
                        {school.wallet.wallet_type} Wallet
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-amber-50 border-2 border-amber-200">
                  <Wallet className="h-6 w-6 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-900">Wallet not available</p>
                    <p className="text-sm text-amber-700">
                      {school.merchant_status === 'pending_onboarding'
                        ? 'Merchant onboarding in progress.'
                        : school.merchant_status === 'kyc_submitted'
                        ? 'KYC submitted. Wallet will be available after approval.'
                        : 'Unable to fetch wallet from payment system.'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
