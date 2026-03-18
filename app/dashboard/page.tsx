'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { School, Users, CreditCard, TrendingUp, Wallet, Building2, CheckCircle, Clock, XCircle, ArrowRight, UserPlus, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, studentsAPI, paymentsAPI, feesAPI, adminAPI, API_BASE_URL } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SchoolData {
  id: string;
  name: string;
  code: string;
  merchant_code?: string;
  merchant_status?: string;
  business_wallet_id?: string;
  wallet?: {
    id: string;
    currency: string;
    balance: number;
    wallet_type: string;
    is_active: boolean;
  };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user && typeof window !== 'undefined') {
      window.location.replace('/login');
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
  const [recentPayments, setRecentPayments] = useState<Array<{ reference: string; amount: number; currency: string; status: string; student_name?: string; created_at: string }>>([]);
  const [recentSchools, setRecentSchools] = useState<Array<{ id: string; name: string; code: string; created_at?: string }>>([]);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait a bit to ensure token is stored before making API calls
    if (user?.role === 'admin') {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            console.log('Loading admin stats with token');
            loadAdminStats();
          } else {
            console.error('Token not available for API calls');
            setLoading(false);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (user?.role === 'school_admin') {
      const timer = setTimeout(() => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            console.log('Loading school admin stats with token');
            loadSchoolAdminStats();
          } else {
            console.error('Token not available for API calls');
            setLoading(false);
          }
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-lg font-medium text-gray-900">Loading...</div>
      </div>
    );
  }

  const loadAdminStats = async () => {
    try {
      const [schoolsRes, statsRes] = await Promise.all([
        schoolsAPI.list(1, 500),
        adminAPI.getStats().catch(() => ({ data: { data: null } })),
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
    } catch (error: unknown) {
      console.error('Failed to load stats:', error);
      const axiosError = error as { response?: { status?: number; data?: { error?: string } }; message?: string };
      if (axiosError.response?.status === 401) {
        console.error('Authentication error loading stats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolAdminStats = async () => {
    try {
      if (typeof window === 'undefined') {
        setLoading(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token available for API calls');
        setLoading(false);
        return;
      }
      
      console.log('Making API calls with token, length:', token.length);
      
      // Get school data using /schools/me endpoint (for school_admin)
      let school: SchoolData | null = null;
      try {
        console.log('Fetching school data from /api/schools/me');
        const schoolRes = await schoolsAPI.getMySchool();
        school = schoolRes.data.data;
        console.log('School data fetched successfully:', school);
        console.log('Wallet data:', school?.wallet);
        console.log('Business Wallet ID:', school?.business_wallet_id);
        console.log('Merchant Code:', school?.merchant_code);
        
        // If wallet is null but we have merchant info, log a warning
        if (school && !school.wallet && school.merchant_code) {
          console.warn('School has merchant code but wallet information is not available. This may indicate:');
          console.warn('  1. Wallet has not been created yet in RDBS Core');
          console.warn('  2. Merchant onboarding is still in progress');
          console.warn('  3. Error fetching wallet from RDBS Core (check backend logs)');
        }
      } catch (err: any) {
        console.error('Failed to fetch school:', err);
        console.error('Error details:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
          config: err.config,
        });
        // Don't fail the whole dashboard if school fetch fails
        // The user can still see other stats
      }
      
      if (school) {
        setSchoolData(school);
      }
      
      const [studentsRes, paymentsRes, feesRes] = await Promise.all([
        studentsAPI.list(1, 1), // Only need 1 for the list, but we'll use total count
        paymentsAPI.list(1, 5), // Get 5 most recent for Recent Payments card
        feesAPI.list(1, 200),   // Fetch fees to count active ones
      ]);
      
      // Extract total counts from paginated responses
      let totalStudents = 0;
      if (studentsRes.data.total !== undefined) {
        // Paginated response with total count
        totalStudents = studentsRes.data.total || 0;
      } else {
        // Fallback to array length if not paginated
        totalStudents = studentsRes.data.data?.length || studentsRes.data.data?.data?.length || 0;
      }
      
      let totalPayments = 0;
      if (paymentsRes.data.total !== undefined) {
        // Paginated response with total count
        totalPayments = paymentsRes.data.total || 0;
      } else {
        // Fallback to array length if not paginated
        totalPayments = paymentsRes.data.data?.length || paymentsRes.data.data?.data?.length || 0;
      }
      
      // Calculate total revenue from payments (PaginatedResponse: data.data = array)
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
      } catch (err) {
        console.error('Failed to calculate revenue:', err);
      }

      // Count active fees
      const fees = feesRes.data.data || [];
      const totalActiveFees = fees.filter((f: { status?: string }) => f.status === 'active').length;
      
      setStats({
        totalSchools: 0,
        totalStudents: totalStudents,
        totalPayments: totalPayments,
        totalRevenue: revenue,
        totalActiveFees: totalActiveFees,
      });

      // Set recent payments for the dashboard card (payments are ordered newest first)
      const recent = paymentsRes.data.data || [];
      setRecentPayments(recent);
    } catch (error: unknown) {
      console.error('Failed to load stats:', error);
      const axiosError = error as { response?: { status?: number; data?: { error?: string }; headers?: unknown }; config?: { url?: string; headers?: { Authorization?: string } }; message?: string };
      console.error('Error details:');
      console.error('  Status:', axiosError.response?.status);
      console.error('  Message:', axiosError.response?.data?.error || axiosError.message);
      if (axiosError.response?.status === 401) {
        console.error('Authentication error loading stats - token may be invalid or expired');
      }
    } finally {
      setLoading(false);
    }
  };

  if (user?.role === 'admin') {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <DashboardLayout>
          <AdminDashboard stats={stats} loading={loading} router={router} recentSchools={recentSchools} pendingApprovalsCount={pendingApprovalsCount} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <SchoolAdminDashboard stats={stats} loading={loading} router={router} schoolData={schoolData} recentPayments={recentPayments} />
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
}: {
  stats: { totalSchools: number; totalStudents: number; totalPayments: number; totalRevenue: number; totalActiveFees?: number };
  loading: boolean;
  router: { push: (path: string) => void };
  recentSchools?: Array<{ id: string; name: string; code: string; created_at?: string }>;
  pendingApprovalsCount?: number;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage schools and oversee the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={stats.totalSchools}
          icon={School}
          description="Registered schools"
          color="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          description="Across all schools"
          color="green"
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          icon={CreditCard}
          description="Platform transactions"
          color="purple"
        />
        <StatCard
          title="Revenue"
          value={`UGX ${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          description="Total collected"
          color="emerald"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovalsCount}
          icon={Clock}
          description="Schools awaiting merchant approval"
          color="orange"
        />
      </div>

      {/* Quick Actions & Recently Onboarded - stacked like school admin */}
      <div className="space-y-6">
        <Card className="border border-primary/20 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <School className="h-4 w-4 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => router.push('/dashboard/schools/onboard')}
                className="h-auto flex-col gap-1.5 py-3 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
              >
                <School className="h-4 w-4" />
                <span className="text-xs font-medium">Onboard School</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/schools')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium">View Schools</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/platform-payments')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-xs font-medium">Platform Payments</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/users')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">Users</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <School className="h-4 w-4 text-blue-600" />
              </div>
              Recently Onboarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSchools.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No schools yet</p>
            ) : (
              <div className="space-y-2">
                {recentSchools.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                      <School className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm text-gray-900">{s.name}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{s.code}</p>
                      {s.created_at && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/schools/${s.id}`)}
                      className="shrink-0 text-blue-600 hover:text-blue-700"
                    >
                      View
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => router.push('/dashboard/schools')}
                >
                  View all schools
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
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
}: {
  stats: { totalSchools: number; totalStudents: number; totalPayments: number; totalRevenue: number; totalActiveFees: number };
  loading: boolean;
  router: { push: (path: string) => void };
  schoolData: SchoolData | null;
  recentPayments?: Array<{ reference: string; amount: number; currency: string; status: string; student_name?: string; created_at: string }>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your school's fees and students</p>
      </div>

      {/* School Details Card */}
      {schoolData && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              School Information
            </CardTitle>
            <CardDescription>Your school details and merchant information</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">School Name</p>
              <p className="text-lg font-semibold">{schoolData.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">School Code</p>
              <p className="text-lg font-semibold">{schoolData.code}</p>
            </div>
            {schoolData.merchant_code && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Merchant Code</p>
                <p className="text-lg font-semibold font-mono">{schoolData.merchant_code}</p>
              </div>
            )}
            <div className="md:col-span-2 lg:col-span-3">
              {schoolData.wallet ? (
                <div className="flex items-center gap-2 p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200 shadow-sm">
                  <div className="rounded-full bg-emerald-100 p-3">
                    <Wallet className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900 mb-1">Wallet Balance</p>
                    <p className="text-3xl font-bold text-emerald-700 mb-1">
                      {schoolData.wallet.currency} {schoolData.wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={schoolData.wallet.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500'}>
                        {schoolData.wallet.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <span className="text-xs text-emerald-600">
                        {schoolData.wallet.wallet_type} Wallet
                      </span>
                      {schoolData.wallet.id && (
                        <span className="text-xs text-muted-foreground font-mono">
                          ID: {schoolData.wallet.id.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <Wallet className="h-6 w-6 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">Wallet Balance</p>
                    {schoolData.merchant_code ? (
                      <>
                        <p className="text-lg text-yellow-700">Wallet information unavailable</p>
                        <p className="text-xs text-yellow-600 mt-1">
                          {schoolData.merchant_status === 'pending_onboarding' 
                            ? 'Merchant onboarding in progress. Wallet will be available after approval.'
                            : 'Unable to fetch wallet balance from payment system. Please contact support if this persists.'}
                        </p>
                        {schoolData.business_wallet_id && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Wallet ID: {schoolData.business_wallet_id}
                          </p>
                        )}
                        {schoolData.merchant_code && (
                          <p className="text-xs text-yellow-600 mt-1">
                            Merchant Code: {schoolData.merchant_code}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-lg text-yellow-700">Loading wallet information...</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          description="Registered students"
          color="green"
        />
        <StatCard
          title="Active Fees"
          value={stats.totalActiveFees}
          icon={Receipt}
          description="Fee structures configured"
          color="blue"
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          icon={CreditCard}
          description="Payment transactions"
          color="purple"
        />
        <StatCard
          title="Revenue"
          value={`UGX ${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          description="Total collected"
          color="emerald"
        />
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <Card className="border border-primary/20 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => router.push('/dashboard/students/add')}
                className="h-auto flex-col gap-1.5 py-3 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
              >
                <UserPlus className="h-4 w-4" />
                <span className="text-xs font-medium">Add Student</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/fees')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Receipt className="h-4 w-4" />
                <span className="text-xs font-medium">Set Fees</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/payments')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
              >
                <Wallet className="h-4 w-4" />
                <span className="text-xs font-medium">Collect Payment</span>
              </Button>
              <Button
                onClick={() => router.push('/dashboard/students')}
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3 border-primary/30 hover:bg-primary/5 hover:border-primary"
              >
                <Users className="h-4 w-4" />
                <span className="text-xs font-medium">View Students</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200/80 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <CreditCard className="h-4 w-4 text-emerald-600" />
              </div>
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No recent payments</p>
            ) : (
              <div className="space-y-2">
                {recentPayments.map((p) => {
                  const isCompleted = p.status === 'completed' || p.status === 'paid';
                  const isFailed = p.status === 'failed';
                  const StatusIcon = isCompleted ? CheckCircle : isFailed ? XCircle : Clock;
                  const receiptUrl = `${API_BASE_URL}/receipts/${p.reference}`;
                  return (
                    <div
                      key={p.reference}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/30"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                        <StatusIcon
                          className={`h-4 w-4 ${
                            isCompleted ? 'text-green-500' : isFailed ? 'text-red-500' : 'text-amber-500'
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-sm text-gray-900">{p.student_name || '—'}</p>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          {p.reference.length > 16 ? `${p.reference.slice(0, 12)}…` : p.reference}
                        </p>
                        {p.created_at && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <p className="font-semibold text-emerald-700">
                          {p.currency} {p.amount?.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="secondary"
                            className={`text-xs font-medium ${
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
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                            >
                              Receipt
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => router.push('/dashboard/payments')}
                >
                  View all payments
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color = 'blue',
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'emerald' | 'red' | 'yellow';
}) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-200',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
    },
    green: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50',
      text: 'text-green-600',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
    },
    purple: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
    },
    orange: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      text: 'text-orange-600',
      border: 'border-orange-200',
      iconBg: 'bg-orange-100',
      iconText: 'text-orange-600',
    },
    emerald: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-200',
      iconBg: 'bg-emerald-100',
      iconText: 'text-emerald-600',
    },
    red: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-200',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
    },
    yellow: {
      bg: 'bg-yellow-500',
      bgLight: 'bg-yellow-50',
      text: 'text-yellow-600',
      border: 'border-yellow-200',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-600',
    },
  };

  const colors = colorClasses[color];

  return (
    <Card className={`border-2 ${colors.border} hover:shadow-lg transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`rounded-lg ${colors.iconBg} p-2.5`}>
          <Icon className={`h-5 w-5 ${colors.iconText}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colors.text} mb-1`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
