'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { School, Users, CreditCard, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, studentsAPI, paymentsAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalPayments: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait a bit to ensure token is stored before making API calls
    if (user?.role === 'admin') {
      const timer = setTimeout(() => {
        // Double-check token is available
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
        // Double-check token is available
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
      // Don't log out on stats loading errors, just show empty stats
      if (error.response?.status === 401) {
        console.error('Authentication error loading stats');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolAdminStats = async () => {
    try {
      // Ensure token is available before making requests
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
      
      const [studentsRes, paymentsRes] = await Promise.all([
        studentsAPI.list(1, 1),
        paymentsAPI.list(1, 1),
      ]);
      setStats({
        totalSchools: 0,
        totalStudents: studentsRes.data.data?.length || studentsRes.data.data?.data?.length || 0,
        totalPayments: paymentsRes.data.data?.length || paymentsRes.data.data?.data?.length || 0,
        totalRevenue: 0,
      });
    } catch (error: unknown) {
      console.error('Failed to load stats:', error);
      const axiosError = error as { response?: { status?: number; data?: { error?: string }; headers?: unknown }; config?: { url?: string; headers?: { Authorization?: string } }; message?: string };
      console.error('Error details:');
      console.error('  Status:', axiosError.response?.status);
      console.error('  Message:', axiosError.response?.data?.error || axiosError.message);
      console.error('  URL:', axiosError.config?.url);
      console.error('  Request Headers:', axiosError.config?.headers);
      console.error('  Response Headers:', axiosError.response?.headers);
      console.error('  Full Error Object:', error);
      // Don't log out on stats loading errors, just show empty stats
      if (axiosError.response?.status === 401) {
        console.error('Authentication error loading stats - token may be invalid or expired');
        // Check if token was actually sent
        const sentToken = axiosError.config?.headers?.Authorization;
        console.error('  Token sent in request:', sentToken ? `${sentToken.substring(0, 30)}...` : 'NOT SENT');
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
        <SchoolAdminDashboard stats={stats} loading={loading} router={router} />
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
}: {
  stats: { totalSchools: number; totalStudents: number; totalPayments: number; totalRevenue: number };
  loading: boolean;
  router: { push: (path: string) => void };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your school's fees and students</p>
      </div>

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
