'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { School, Users, CreditCard, TrendingUp, Wallet, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, studentsAPI, paymentsAPI } from '@/lib/api';
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
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalPayments: 0,
    totalRevenue: 0,
  });
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
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

  const loadAdminStats = async () => {
    try {
      const schoolsRes = await schoolsAPI.list(1, 1);
      setStats({
        totalSchools: schoolsRes.data.data?.length || schoolsRes.data.data?.data?.length || 0,
        totalStudents: 0,
        totalPayments: 0,
        totalRevenue: 0,
      });
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
      
      const [studentsRes, paymentsRes] = await Promise.all([
        studentsAPI.list(1, 1), // Only need 1 for the list, but we'll use total count
        paymentsAPI.list(1, 1),
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
      
      // Calculate total revenue from payments
      let revenue = 0;
      try {
        const allPaymentsRes = await paymentsAPI.list(1, 100);
        const payments = allPaymentsRes.data.data?.data || allPaymentsRes.data.data || [];
        revenue = payments.reduce((sum: number, p: { amount: number; status: string }) => {
          if (p.status === 'completed' || p.status === 'paid') {
            return sum + (p.amount || 0);
          }
          return sum;
        }, 0);
      } catch (err) {
        console.error('Failed to calculate revenue:', err);
      }
      
      setStats({
        totalSchools: 0,
        totalStudents: totalStudents,
        totalPayments: totalPayments,
        totalRevenue: revenue,
      });
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
          <AdminDashboard stats={stats} loading={loading} router={router} />
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <SchoolAdminDashboard stats={stats} loading={loading} router={router} schoolData={schoolData} />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AdminDashboard({
  stats,
  loading,
  router,
}: {
  stats: { totalSchools: number; totalStudents: number; totalPayments: number; totalRevenue: number };
  loading: boolean;
  router: { push: (path: string) => void };
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
          description="Active schools"
          color="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={0}
          icon={TrendingUp}
          description="Schools awaiting approval"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/schools')}
              className="w-full bg-[#08163d] hover:bg-[#0a1f4f] text-white"
            >
              + Onboard New School
            </Button>
            <Button
              onClick={() => router.push('/dashboard/schools')}
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary"
            >
              View All Schools
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent activity</p>
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
}: {
  stats: { totalSchools: number; totalStudents: number; totalPayments: number; totalRevenue: number };
  loading: boolean;
  router: { push: (path: string) => void };
  schoolData: SchoolData | null;
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
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/students')}
              className="w-full bg-[#08163d] hover:bg-[#0a1f4f] text-white"
            >
              + Add Student
            </Button>
            <Button
              onClick={() => router.push('/dashboard/fees')}
              variant="outline"
              className="w-full border-primary/30 hover:bg-primary/10 hover:border-primary"
            >
              Set School Fees
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No recent payments</p>
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
