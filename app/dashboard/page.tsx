'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  School,
  Users,
  CreditCard,
  TrendingUp,
  Wallet,
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  UserPlus,
  Receipt,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, studentsAPI, paymentsAPI, feesAPI, adminAPI, API_BASE_URL } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { GenderInsights, MonthlyRevenueInsights } from '@/lib/api/types';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
import { StatSummaryCard } from '@/components/dashboard/StatSummaryCard';
import { RevenueBarChart } from '@/components/dashboard/RevenueBarChart';
import { GenderDonutChart } from '@/components/dashboard/GenderDonutChart';
import { ActivityListCard } from '@/components/dashboard/ActivityListCard';

interface SchoolData {
  id: string;
  name: string;
  code: string;
  merchant_code?: string;
  merchant_status?: string;
  business_wallet_id?: string;
  wallet_status?: 'ok' | 'pending_merchant' | 'rdbs_unreachable' | 'missing';
  wallet?: {
    id: string;
    currency: string;
    balance: number;
    wallet_type: string;
    is_active: boolean;
  };
}

/** Business MNO collection fee (school absorbs; parents pay gross). Matches rdbs_core default. */
const COLLECTION_FEE_PERCENT = 2.5;

function collectionFeeBreakdown(grossCollected: number) {
  const safeGross = Number.isFinite(grossCollected) && grossCollected > 0 ? grossCollected : 0;
  const netAfterFees = Math.floor(safeGross * (1 - COLLECTION_FEE_PERCENT / 100));
  const processingFee = Math.round((safeGross - netAfterFees) * 100) / 100;
  return {
    processingFee,
    netAfterFees,
    feePercent: COLLECTION_FEE_PERCENT,
  };
}

function chartMonths(insights: MonthlyRevenueInsights | null) {
  return (insights?.months || []).map((m) => ({
    label: m.label,
    collected: m.collected || 0,
    processing_fee: m.processing_fee || 0,
  }));
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user && typeof window !== 'undefined') {
      window.location.replace('/');
    }
  }, [user, authLoading]);

  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalPayments: 0,
    totalRevenue: 0,
    totalActiveFees: 0,
  });
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [recentPayments, setRecentPayments] = useState<
    Array<{
      reference: string;
      amount: number;
      currency: string;
      status: string;
      student_name?: string;
      created_at: string;
    }>
  >([]);
  const [recentSchools, setRecentSchools] = useState<
    Array<{ id: string; name: string; code: string; created_at?: string }>
  >([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [monthlyInsights, setMonthlyInsights] = useState<MonthlyRevenueInsights | null>(null);
  const [genderInsights, setGenderInsights] = useState<GenderInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminStats();
    } else if (user?.role === 'school_admin') {
      loadSchoolAdminStats();
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingState label="Loading…" size="lg" />
      </div>
    );
  }

  const loadAdminStats = async () => {
    try {
      const [schoolsRes, statsRes, monthlyRes, genderRes] = await Promise.all([
        schoolsAPI.list(1, 500),
        adminAPI.getStats().catch((err) => {
          toast.error(getApiErrorMessage(err, 'Failed to load platform stats'));
          return { data: { data: null } };
        }),
        adminAPI.getMonthlyInsights().catch(() => ({ data: { data: null } })),
        adminAPI.getGenderInsights().catch(() => ({ data: { data: null } })),
      ]);
      const schools = schoolsRes.data.data || [];
      const platformStats = statsRes.data?.data;
      const totalSchools = Array.isArray(schools) ? schools.length : 0;
      const pendingApprovals = Array.isArray(schools)
        ? schools.filter(
            (s: { merchant_status?: string }) =>
              s.merchant_status === 'pending_onboarding' || s.merchant_status === 'kyc_submitted'
          ).length
        : 0;
      setStats({
        totalSchools: platformStats?.total_schools ?? totalSchools,
        totalStudents: platformStats?.total_students ?? 0,
        totalPayments: platformStats?.total_payments ?? 0,
        totalRevenue: platformStats?.total_revenue ?? 0,
        totalActiveFees: 0,
      });
      setMonthlyInsights(monthlyRes.data?.data || null);
      setGenderInsights(genderRes.data?.data || null);
      setRecentSchools(
        Array.isArray(schools)
          ? [...schools]
              .sort(
                (a: { created_at?: string }, b: { created_at?: string }) =>
                  new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
              )
              .slice(0, 5)
          : []
      );
      setPendingApprovalsCount(pendingApprovals);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolAdminStats = async () => {
    try {
      let school: SchoolData | null = null;
      try {
        const schoolRes = await schoolsAPI.getMySchool();
        school = schoolRes.data.data;
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setSchoolSetupRequired(true);
          setLoading(false);
          return;
        }
        toast.error(getApiErrorMessage(err, 'Failed to load school profile'));
      }

      if (school) {
        setSchoolData(school);
      }

      const [studentsRes, paymentsRes, feesRes, monthlyRes, genderRes] = await Promise.all([
        studentsAPI.list(1, 1),
        paymentsAPI.list(1, 5),
        feesAPI.list(1, 200),
        paymentsAPI.getMonthlyInsights().catch(() => ({ data: { data: null } })),
        studentsAPI.getGenderInsights().catch(() => ({ data: { data: null } })),
      ]);

      let totalStudents = 0;
      if (studentsRes.data.total !== undefined) {
        totalStudents = studentsRes.data.total || 0;
      } else {
        totalStudents = studentsRes.data.data?.length || 0;
      }

      let totalPayments = 0;
      if (paymentsRes.data.total !== undefined) {
        totalPayments = paymentsRes.data.total || 0;
      } else {
        totalPayments = paymentsRes.data.data?.length || 0;
      }

      let revenue = 0;
      try {
        const allPaymentsRes = await paymentsAPI.list(1, 100);
        const payments = allPaymentsRes.data.data || [];
        revenue = payments.reduce((sum: number, p: { amount: number; status: string }) => {
          if (p.status === 'completed' || p.status === 'paid') {
            return sum + (p.amount || 0);
          }
          return sum;
        }, 0);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to calculate revenue'));
      }

      const fees = feesRes.data.data || [];
      const totalActiveFees = fees.filter((f: { status?: string }) => f.status === 'active').length;

      setStats({
        totalSchools: 0,
        totalStudents: totalStudents,
        totalPayments: totalPayments,
        totalRevenue: revenue,
        totalActiveFees: totalActiveFees,
      });
      setMonthlyInsights(monthlyRes.data?.data || null);
      setGenderInsights(genderRes.data?.data || null);

      const recent = paymentsRes.data.data || [];
      setRecentPayments(recent);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
          <AdminDashboard
            stats={stats}
            loading={loading}
            router={router}
            recentSchools={recentSchools}
            pendingApprovalsCount={pendingApprovalsCount}
            monthlyInsights={monthlyInsights}
            genderInsights={genderInsights}
          />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <SchoolAdminDashboard
          stats={stats}
          loading={loading}
          router={router}
          schoolData={schoolData}
          recentPayments={recentPayments}
          schoolSetupRequired={schoolSetupRequired}
          monthlyInsights={monthlyInsights}
          genderInsights={genderInsights}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AdminDashboard({
  stats,
  loading,
  router,
  recentSchools = [],
  pendingApprovalsCount = 0,
  monthlyInsights,
  genderInsights,
}: {
  stats: {
    totalSchools: number;
    totalStudents: number;
    totalPayments: number;
    totalRevenue: number;
    totalActiveFees?: number;
  };
  loading: boolean;
  router: { push: (path: string) => void };
  recentSchools?: Array<{ id: string; name: string; code: string; created_at?: string }>;
  pendingApprovalsCount?: number;
  monthlyInsights: MonthlyRevenueInsights | null;
  genderInsights: GenderInsights | null;
}) {
  if (loading) {
    return <LoadingState label="Loading dashboard…" className="py-24" size="lg" />;
  }

  return (
    <div className="space-y-6">
      <div className="sm:hidden">
        <h2 className="text-lg font-semibold text-[#08163d]">Dashboard</h2>
        <p className="mt-0.5 text-xs text-slate-500">Manage schools and oversee the platform</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatSummaryCard
          title="Schools"
          value={stats.totalSchools}
          description="Registered schools"
          icon={School}
          accent="navy"
          onClick={() => router.push('/dashboard/schools')}
        />
        <StatSummaryCard
          title="Students"
          value={stats.totalStudents}
          description="Across all schools"
          icon={Users}
          accent="gold"
        />
        <StatSummaryCard
          title="Payments"
          value={stats.totalPayments}
          description="Platform transactions"
          icon={CreditCard}
          accent="muted"
          onClick={() => router.push('/dashboard/platform-payments')}
        />
        <StatSummaryCard
          title="Revenue"
          value={`UGX ${stats.totalRevenue.toLocaleString()}`}
          description="Total collected"
          icon={TrendingUp}
          accent="emerald"
        />
        <StatSummaryCard
          title="Pending Approvals"
          value={pendingApprovalsCount}
          description="Awaiting merchant approval"
          icon={Clock}
          accent="gold"
          onClick={() => router.push('/dashboard/pending-approvals')}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,1fr)]">
        <RevenueBarChart
          title="Platform collections"
          year={monthlyInsights?.year}
          data={chartMonths(monthlyInsights)}
          primaryLabel="Collected"
          secondaryLabel="Processing fee"
        />
        <GenderDonutChart data={genderInsights} title="Students" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.9fr)]">
        <ActivityListCard
          title="Recently Onboarded"
          icon={
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4C2]">
              <School className="h-3.5 w-3.5 text-[#E8A317]" />
            </div>
          }
          emptyLabel="No schools yet"
          viewAllLabel="View all schools"
          onViewAll={() => router.push('/dashboard/schools')}
          items={recentSchools.map((s) => ({
            id: s.id,
            title: s.name,
            subtitle: s.code,
            meta: s.created_at
              ? new Date(s.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : undefined,
            badge: (
              <div className="flex h-full w-full items-center justify-center bg-[#F8F9FB]">
                <School className="h-3.5 w-3.5 text-[#08163d]" />
              </div>
            ),
            onClick: () => router.push(`/dashboard/schools/${s.id}`),
          }))}
        />

        <div className="rounded-2xl bg-[#08163d] p-4 text-white shadow-[0_6px_18px_rgba(8,22,61,0.22)]">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <p className="mt-0.5 text-[11px] text-white/75">Jump into everyday platform tasks.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={() => router.push('/dashboard/schools/onboard')}
              className="h-auto flex-col gap-1 bg-[#E8A317] py-2.5 text-[#08163d] hover:bg-[#d49414]"
            >
              <School className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Onboard School</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/schools')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">View Schools</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/platform-payments')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Platform Payments</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/users')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Users</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchoolAdminDashboard({
  stats,
  loading,
  router,
  schoolData,
  recentPayments = [],
  schoolSetupRequired = false,
  monthlyInsights,
  genderInsights,
}: {
  stats: {
    totalSchools: number;
    totalStudents: number;
    totalPayments: number;
    totalRevenue: number;
    totalActiveFees: number;
  };
  loading: boolean;
  router: { push: (path: string) => void };
  schoolData: SchoolData | null;
  recentPayments?: Array<{
    reference: string;
    amount: number;
    currency: string;
    status: string;
    student_name?: string;
    created_at: string;
  }>;
  schoolSetupRequired?: boolean;
  monthlyInsights: MonthlyRevenueInsights | null;
  genderInsights: GenderInsights | null;
}) {
  if (loading) {
    return <LoadingState label="Loading dashboard…" className="py-24" size="lg" />;
  }

  const feeBreakdown = collectionFeeBreakdown(stats.totalRevenue);

  return (
    <div className="space-y-6">
      {schoolSetupRequired && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">School setup required</CardTitle>
            <CardDescription className="text-amber-800">
              This account is active, but no school is linked yet. Complete school onboarding before
              accessing students, payments, and fees.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => router.push('/dashboard/schools/onboard')}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Onboard School
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
              Open Settings
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="sm:hidden">
        <h2 className="text-lg font-semibold text-[#08163d]">Dashboard</h2>
        <p className="mt-0.5 text-xs text-slate-500">Manage your school&apos;s fees and students</p>
      </div>

      {schoolData && (
        <div className="rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4C2]">
              <Building2 className="h-3.5 w-3.5 text-[#E8A317]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#08163d]">School Information</h3>
              <p className="text-[10px] text-slate-400">Your school details and merchant information</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-[11px] font-medium text-slate-500">School Name</p>
              <p className="text-sm font-semibold text-[#08163d]">{schoolData.name}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">School Code</p>
              <p className="text-sm font-semibold text-[#08163d]">{schoolData.code}</p>
            </div>
            {schoolData.merchant_code && (
              <div>
                <p className="text-[11px] font-medium text-slate-500">Merchant Code</p>
                <p className="font-mono text-sm font-semibold text-[#08163d]">
                  {schoolData.merchant_code}
                </p>
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-3">
              {schoolData.wallet ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                  <div className="rounded-full bg-emerald-100 p-2">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="mb-0.5 text-[11px] font-medium text-emerald-900">Wallet Balance</p>
                    <p className="mb-1 text-xl font-bold text-emerald-700">
                      {schoolData.wallet.currency}{' '}
                      {schoolData.wallet.balance.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge
                        className={
                          schoolData.wallet.is_active
                            ? 'bg-green-500 hover:bg-green-600'
                            : 'bg-gray-500'
                        }
                      >
                        {schoolData.wallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-[10px] text-emerald-600">
                        {schoolData.wallet.wallet_type} Wallet
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                  <Wallet className="h-5 w-5 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-[11px] font-medium text-yellow-900">Wallet Balance</p>
                    {schoolData.wallet_status === 'rdbs_unreachable' ? (
                      <>
                        <p className="text-sm text-yellow-700">
                          Payment system temporarily unreachable
                        </p>
                        <p className="mt-0.5 text-[10px] text-yellow-600">
                          Your school is still linked. Wallet balance will show again when the
                          payment system is back.
                        </p>
                      </>
                    ) : schoolData.wallet_status === 'pending_merchant' ||
                      schoolData.merchant_status === 'pending_onboarding' ? (
                      <>
                        <p className="text-sm text-yellow-700">Wallet not ready yet</p>
                        <p className="mt-0.5 text-[10px] text-yellow-600">
                          Merchant onboarding in progress. Wallet will be available after approval.
                        </p>
                      </>
                    ) : schoolData.wallet_status === 'missing' ? (
                      <>
                        <p className="text-sm text-yellow-700">Wallet not found for this school</p>
                        <p className="mt-0.5 text-[10px] text-yellow-600">
                          Contact support if this persists — do not recreate the school unless
                          asked.
                        </p>
                      </>
                    ) : schoolData.merchant_code ? (
                      <>
                        <p className="text-sm text-yellow-700">Wallet information unavailable</p>
                        <p className="mt-0.5 text-[10px] text-yellow-600">
                          Unable to load wallet details right now. Please try again shortly.
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-700">Loading wallet information...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatSummaryCard
          title="Students"
          value={stats.totalStudents}
          description="Registered students"
          icon={Users}
          accent="gold"
          onClick={() => router.push('/dashboard/students')}
        />
        <StatSummaryCard
          title="Active Fees"
          value={stats.totalActiveFees}
          description="Fee structures configured"
          icon={Receipt}
          accent="navy"
          onClick={() => router.push('/dashboard/fees')}
        />
        <StatSummaryCard
          title="Payments"
          value={stats.totalPayments}
          description="Payment transactions"
          icon={CreditCard}
          accent="muted"
          onClick={() => router.push('/dashboard/payments')}
        />
        <StatSummaryCard
          title="Revenue"
          value={`UGX ${stats.totalRevenue.toLocaleString()}`}
          description="Total collected from parents"
          icon={TrendingUp}
          accent="emerald"
        />
        <StatSummaryCard
          title="Processing fee"
          value={`UGX ${feeBreakdown.processingFee.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          description={`${COLLECTION_FEE_PERCENT}% deducted before wallet credit`}
          icon={TrendingUp}
          accent="gold"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(240px,1fr)]">
        <RevenueBarChart
          title="Collections"
          year={monthlyInsights?.year}
          data={chartMonths(monthlyInsights)}
          primaryLabel="Collected"
          secondaryLabel="Processing fee"
        />
        <GenderDonutChart data={genderInsights} title="Students" />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.9fr)]">
        <ActivityListCard
          title="Recent Payments"
          icon={
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
              <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
            </div>
          }
          emptyLabel="No recent payments"
          viewAllLabel="View all payments"
          onViewAll={() => router.push('/dashboard/payments')}
          items={recentPayments.map((p) => {
            const isCompleted = p.status === 'completed' || p.status === 'paid';
            const isFailed = p.status === 'failed';
            const StatusIcon = isCompleted ? CheckCircle : isFailed ? XCircle : Clock;
            const receiptUrl = `${API_BASE_URL}/receipts/${p.reference}`;
            return {
              id: p.reference,
              title: p.student_name || '—',
              subtitle:
                p.reference.length > 16 ? `${p.reference.slice(0, 12)}…` : p.reference,
              meta: p.created_at
                ? new Date(p.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : undefined,
              badge: (
                <div className="flex h-full w-full items-center justify-center bg-white">
                  <StatusIcon
                    className={`h-3.5 w-3.5 ${
                      isCompleted
                        ? 'text-green-500'
                        : isFailed
                          ? 'text-red-500'
                          : 'text-amber-500'
                    }`}
                  />
                </div>
              ),
              trailing: (
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <p className="text-xs font-semibold text-emerald-700">
                    {p.currency} {p.amount?.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] font-medium ${
                        isCompleted
                          ? 'bg-green-100 text-green-700 hover:bg-green-100'
                          : isFailed
                            ? 'bg-red-100 text-red-700 hover:bg-red-100'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {p.status}
                    </Badge>
                    {isCompleted && (
                      <a
                        href={receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Receipt
                      </a>
                    )}
                  </div>
                </div>
              ),
            };
          })}
        />

        <div className="rounded-2xl bg-[#08163d] p-4 text-white shadow-[0_6px_18px_rgba(8,22,61,0.22)]">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <p className="mt-0.5 text-[11px] text-white/75">Keep school operations moving.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              onClick={() => router.push('/dashboard/students/add')}
              className="h-auto flex-col gap-1 bg-[#E8A317] py-2.5 text-[#08163d] hover:bg-[#d49414]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Add Student</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/fees')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Set Fees</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/payments')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Collect Payment</span>
            </Button>
            <Button
              onClick={() => router.push('/dashboard/students')}
              variant="outline"
              className="h-auto flex-col gap-1 border-white/20 bg-white/5 py-2.5 text-white hover:bg-white/10 hover:text-white"
            >
              <Users className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">View Students</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
