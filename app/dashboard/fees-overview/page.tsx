'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { paymentsAPI } from '@/lib/api';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type OverviewStatus = 'all' | 'paid' | 'partial' | 'unpaid';

interface OverviewStudentRow {
  student_id: string;
  registration_id: string;
  student_name: string;
  class: string;
  total_fees: number;
  total_paid: number;
  carry_forward_balance: number;
  outstanding: number;
  payment_status: 'full' | 'partial' | 'outstanding';
  last_payment_at?: string;
}

interface OverviewResponse {
  total_students: number;
  paid_students: number;
  partial_students: number;
  unpaid_students: number;
  total_expected: number;
  total_collected: number;
  total_outstanding: number;
  page: number;
  page_size: number;
  total_pages: number;
  students: OverviewStudentRow[];
}

export default function FeesOverviewPage() {
  const defaultPageSize = 100;
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [term, setTerm] = useState<string>('all');
  const [className, setClassName] = useState<string>('');
  const [status, setStatus] = useState<OverviewStatus>('all');
  const [page, setPage] = useState(1);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);

  const loadOverview = async (nextPage = page) => {
    try {
      setLoading(true);
      const res = await paymentsAPI.getOverview({
        academic_year: academicYear || undefined,
        term: term === 'all' ? undefined : term,
        class: className || undefined,
        status,
        page: nextPage,
        page_size: defaultPageSize,
      });
      setOverview(res.data.data);
      setPage(nextPage);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load fees overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const formatCurrency = (value: number) => `UGX ${value.toLocaleString()}`;

  const exportCsv = () => {
    if (!overview || overview.students.length === 0) {
      toast.error('No records to export');
      return;
    }

    const header = [
      'Registration ID',
      'Student Name',
      'Class',
      'Total Fees',
      'Total Paid',
      'Carry Forward',
      'Outstanding',
      'Status',
    ];
    const rows = overview.students.map((row) => [
      row.registration_id,
      row.student_name,
      row.class,
      row.total_fees.toFixed(2),
      row.total_paid.toFixed(2),
      row.carry_forward_balance.toFixed(2),
      row.outstanding.toFixed(2),
      row.payment_status,
    ]);

    const csv = [header, ...rows]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fees-overview-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const statusBadge = (value: OverviewStudentRow['payment_status']) => {
    if (value === 'full') return <Badge className="bg-green-500">Paid</Badge>;
    if (value === 'partial') return <Badge className="bg-yellow-500">Partial</Badge>;
    return <Badge className="bg-red-500">Unpaid</Badge>;
  };

  const classes = useMemo(() => {
    if (!overview) return [];
    return Array.from(new Set(overview.students.map((s) => s.class))).sort();
  }, [overview]);

  const applyFilters = async () => {
    await loadOverview(1);
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Fees Overview</h1>
              <p className="mt-2 text-muted-foreground">Paid/unpaid visibility by class and term (includes carry-forward)</p>
            </div>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter by academic year, term, class, and payment status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <Input placeholder="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All terms</SelectItem>
                  <SelectItem value="Term 1">Term 1</SelectItem>
                  <SelectItem value="Term 2">Term 2</SelectItem>
                  <SelectItem value="Term 3">Term 3</SelectItem>
                </SelectContent>
              </Select>
              <Select value={className || 'all'} onValueChange={(v) => setClassName(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={(v) => setStatus(v as OverviewStatus)}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={applyFilters} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Students</p><p className="text-2xl font-bold">{overview?.total_students || 0}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold text-green-600">{formatCurrency(overview?.total_collected || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-red-600">{formatCurrency(overview?.total_outstanding || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Expected</p><p className="text-2xl font-bold">{formatCurrency(overview?.total_expected || 0)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Breakdown</CardTitle>
              <CardDescription>Drill down to student-level balances</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Carry-Forward</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview?.students || []).map((row) => (
                    <TableRow key={row.student_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.student_name}</p>
                          <p className="text-xs text-muted-foreground">{row.registration_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.class}</TableCell>
                      <TableCell>{formatCurrency(row.total_fees)}</TableCell>
                      <TableCell className="text-green-700">{formatCurrency(row.total_paid)}</TableCell>
                      <TableCell>{formatCurrency(row.carry_forward_balance)}</TableCell>
                      <TableCell className="text-red-700">{formatCurrency(row.outstanding)}</TableCell>
                      <TableCell>{statusBadge(row.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>
                  Page {overview?.page || page} of {overview?.total_pages || 1}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || (overview?.page || page) <= 1}
                    onClick={() => loadOverview((overview?.page || page) - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || !overview || overview.page >= overview.total_pages}
                    onClick={() => loadOverview((overview?.page || page) + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
