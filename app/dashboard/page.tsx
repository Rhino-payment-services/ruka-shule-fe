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
    if (user?.role === 'admin') {
      loadAdminStats();
    } else if (user?.role === 'school_admin') {
      loadSchoolAdminStats();
    }
  }, [user]);

  const loadAdminStats = async () => {
    try {
      const schoolsRes = await schoolsAPI.list(1, 1);
      setStats({
        totalSchools: schoolsRes.data.data?.length || 0,
        totalStudents: 0,
        totalPayments: 0,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolAdminStats = async () => {
    try {
      const [studentsRes, paymentsRes] = await Promise.all([
        studentsAPI.list(1, 1),
        paymentsAPI.list(1, 1),
      ]);
      setStats({
        totalSchools: 0,
        totalStudents: studentsRes.data.data?.length || 0,
        totalPayments: paymentsRes.data.data?.length || 0,
        totalRevenue: 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
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
  stats: any;
  loading: boolean;
  router: any;
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
        />
        <StatCard
          title="Pending Approvals"
          value={0}
          icon={TrendingUp}
          description="Schools awaiting approval"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/schools')}
              className="w-full"
            >
              + Onboard New School
            </Button>
            <Button
              onClick={() => router.push('/dashboard/schools')}
              variant="outline"
              className="w-full"
            >
              View All Schools
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
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
  stats: any;
  loading: boolean;
  router: any;
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
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments}
          icon={CreditCard}
          description="Payment transactions"
        />
        <StatCard
          title="Revenue"
          value={`UGX ${stats.totalRevenue.toLocaleString()}`}
          icon={TrendingUp}
          description="Total collected"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push('/dashboard/students')}
              className="w-full"
            >
              + Add Student
            </Button>
            <Button
              onClick={() => router.push('/dashboard/fees')}
              variant="outline"
              className="w-full"
            >
              Set School Fees
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
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
}: {
  title: string;
  value: string | number;
  icon: any;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="rounded-lg bg-primary p-2">
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
