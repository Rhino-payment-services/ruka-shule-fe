'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { paymentsAPI, schoolsAPI } from '@/lib/api';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ListPagination } from '@/components/ListPagination';
import { LoadingState } from '@/components/LoadingState';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import { getApiErrorMessage, verifySchoolContextIssue } from '@/lib/api/errors';

type OverviewStatus = 'all' | 'paid' | 'partial' | 'unpaid';

/** First academic year shipped with this product; options grow with the calendar. */
const ACADEMIC_YEAR_START = 2026;

function currentAcademicYear(): number {
  return Math.max(new Date().getFullYear(), ACADEMIC_YEAR_START);
}

function academicYearOptionsFrom(startYear: number): string[] {
  const end = currentAcademicYear();
  const years: string[] = [];
  for (let year = end; year >= startYear; year -= 1) {
    years.push(String(year));
  }
  return years;
}

interface OverviewStudentRow {
  student_id: string;
  registration_id: string;
  student_name: string;
  class: string;
  gender?: string;
  total_fees: number;
  school_fee_total?: number;
  other_fee_total?: number;
  fee_total?: number;
  one_off_total?: number;
  total_paid: number;
  carry_forward_balance: number;
  outstanding: number;
  fee_outstanding?: number;
  one_off_outstanding?: number;
  due_type?: 'fees' | 'one_off' | 'both' | 'none';
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
  total_school_fees?: number;
  total_other_fees?: number;
  total_fee_outstanding?: number;
  total_one_off_outstanding?: number;
  students_with_fee_outstanding?: number;
  students_with_one_off_outstanding?: number;
  students_with_both_balances?: number;
  page: number;
  page_size: number;
  total_pages: number;
  students: OverviewStudentRow[];
}

export default function FeesOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [academicYear, setAcademicYear] = useState(() => String(currentAcademicYear()));
  const [term, setTerm] = useState<string>('all');
  const [className, setClassName] = useState<string>('');
  const [gender, setGender] = useState<string>('');
  const [status, setStatus] = useState<OverviewStatus>('all');
  const [page, setPage] = useState(1);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);

  const academicYearOptions = useMemo(
    () => academicYearOptionsFrom(ACADEMIC_YEAR_START),
    [],
  );

  const loadOverview = async (nextPage = page) => {
    if (schoolSetupRequired) return;
    try {
      setLoading(true);
      const res = await paymentsAPI.getOverview({
        academic_year: academicYear || undefined,
        term: term === 'all' ? undefined : term,
        class: className || undefined,
        gender: gender || undefined,
        status,
        page: nextPage,
        page_size: DEFAULT_PAGE_SIZE,
      });
      const data = res.data.data;
      const meta = normalizePaginationMeta(data || {}, nextPage);
      setOverview(data);
      setPage(meta.page);
    } catch (error: unknown) {
      const schoolContext = await verifySchoolContextIssue(error, () => schoolsAPI.getMySchool());
      if (schoolContext === 'missing_school_link') {
        setSchoolSetupRequired(true);
        setOverview(null);
      } else if (schoolContext === 'unexpected_context') {
        toast.error(
          'Your school link exists, but school context could not be verified. Please refresh and try again.',
        );
      } else {
        toast.error(getApiErrorMessage(error, 'Failed to load fees overview'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSchool = async () => {
      try {
        const res = await schoolsAPI.getMySchool();
        const classes = res.data.data?.classes;
        if (Array.isArray(classes)) {
          setSchoolClasses([...classes].sort());
        }
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setSchoolSetupRequired(true);
        }
      } finally {
        setSchoolChecked(true);
      }
    };
    checkSchool();
  }, []);

  useEffect(() => {
    if (!schoolChecked || schoolSetupRequired) {
      setLoading(false);
      return;
    }
    loadOverview();
  }, [schoolChecked, schoolSetupRequired]);

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
      'Gender',
      'School Fees',
      'Other Fees',
      'Fee Outstanding',
      'Additional Charges',
      'Total Paid',
      'Carry Forward',
      'Outstanding',
      'Due Type',
      'Status',
    ];
    const rows = overview.students.map((row) => [
      row.registration_id,
      row.student_name,
      row.class,
      row.gender || '',
      (row.school_fee_total || 0).toFixed(2),
      (row.other_fee_total || 0).toFixed(2),
      (row.fee_outstanding || 0).toFixed(2),
      (row.one_off_outstanding || 0).toFixed(2),
      row.total_paid.toFixed(2),
      row.carry_forward_balance.toFixed(2),
      row.outstanding.toFixed(2),
      row.due_type || 'none',
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

  const dueTypeBadge = (value?: OverviewStudentRow['due_type']) => {
    if (value === 'both') return <Badge variant="destructive">Both</Badge>;
    if (value === 'fees') return <Badge variant="secondary">Fees</Badge>;
    if (value === 'one_off') return <Badge className="bg-rose-500">Additional</Badge>;
    return <Badge variant="outline">Clear</Badge>;
  };

  const classes = useMemo(() => {
    if (schoolClasses.length > 0) return schoolClasses;
    if (!overview) return [];
    return Array.from(new Set(overview.students.map((s) => s.class))).sort();
  }, [overview, schoolClasses]);

  const applyFilters = async () => {
    setPage(1);
    await loadOverview(1);
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {schoolSetupRequired && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">School setup required</CardTitle>
                <CardDescription className="text-amber-800">
                  This account is active, but no school is linked yet. Complete school onboarding before viewing fees overview.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => router.push('/dashboard/schools/onboard')} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Onboard School
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard/settings')}>
                  Open Settings
                </Button>
              </CardContent>
            </Card>
          )}

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
              <CardDescription>Filter by academic year, term, class, gender, and payment status</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-6">
              <Select
                value={academicYear}
                onValueChange={setAcademicYear}
              >
                <SelectTrigger><SelectValue placeholder="Academic year" /></SelectTrigger>
                <SelectContent>
                  {academicYearOptions.map((year) => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={gender || 'all'} onValueChange={(v) => setGender(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Students</p><p className="text-2xl font-bold">{loading ? '—' : (overview?.total_students || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold text-green-600">{loading ? '—' : formatCurrency(overview?.total_collected || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">School Fees</p><p className="text-2xl font-bold">{loading ? '—' : formatCurrency(overview?.total_school_fees || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Other Fees</p><p className="text-2xl font-bold">{loading ? '—' : formatCurrency(overview?.total_other_fees || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Fee Outstanding</p><p className="text-2xl font-bold text-amber-600">{loading ? '—' : formatCurrency(overview?.total_fee_outstanding || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Additional Charges</p><p className="text-2xl font-bold text-rose-600">{loading ? '—' : formatCurrency(overview?.total_one_off_outstanding || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-2xl font-bold text-red-600">{loading ? '—' : formatCurrency(overview?.total_outstanding || 0)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Breakdown</CardTitle>
              <CardDescription>
                Track fee balances, additional charges, and students who owe both in one place
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState label="Loading fees overview…" />
              ) : (
                <>
              <div className="mb-4 flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">
                  Fees due: {overview?.students_with_fee_outstanding || 0}
                </Badge>
                <Badge className="bg-rose-500">
                  Additional due: {overview?.students_with_one_off_outstanding || 0}
                </Badge>
                <Badge variant="destructive">
                  Both due: {overview?.students_with_both_balances || 0}
                </Badge>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>School Fees</TableHead>
                    <TableHead>Other Fees</TableHead>
                    <TableHead>Fee outstanding</TableHead>
                    <TableHead>Additional Charges</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Carry-Forward</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Due Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview?.students || []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="py-8 text-center text-muted-foreground">
                        No students found for these filters
                        {academicYear ? ` (no fee activity for ${academicYear})` : ''}
                      </TableCell>
                    </TableRow>
                  ) : (
                    (overview?.students || []).map((row) => (
                    <TableRow key={row.student_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{row.student_name}</p>
                          <p className="text-xs text-muted-foreground">{row.registration_id}</p>
                        </div>
                      </TableCell>
                      <TableCell>{row.class}</TableCell>
                      <TableCell>{row.gender || '—'}</TableCell>
                      <TableCell>{formatCurrency(row.school_fee_total || 0)}</TableCell>
                      <TableCell>{formatCurrency(row.other_fee_total || 0)}</TableCell>
                      <TableCell>{formatCurrency(row.fee_outstanding || 0)}</TableCell>
                      <TableCell className="text-red-700">{formatCurrency(row.one_off_outstanding || 0)}</TableCell>
                      <TableCell className="text-green-700">{formatCurrency(row.total_paid)}</TableCell>
                      <TableCell>{formatCurrency(row.carry_forward_balance)}</TableCell>
                      <TableCell className="text-red-700">{formatCurrency(row.outstanding)}</TableCell>
                      <TableCell>{dueTypeBadge(row.due_type)}</TableCell>
                      <TableCell>{statusBadge(row.payment_status)}</TableCell>
                    </TableRow>
                  ))
                  )}
                </TableBody>
              </Table>
              <ListPagination
                className="mt-4"
                page={page}
                totalPages={normalizePaginationMeta(overview || {}, page).totalPages}
                total={overview?.total_students}
                loading={loading}
                onPageChange={(nextPage) => void loadOverview(nextPage)}
              />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
