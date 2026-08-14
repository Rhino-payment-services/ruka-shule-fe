'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { oneOffChargesAPI, schoolsAPI, studentsAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Search, 
  Eye,
  Loader2,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Pencil,
  Trash2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { paymentsAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta, useDebouncedValue } from '@/lib/hooks/useServerPagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Student {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  school_fees_amount?: number;
  resolved_school_fees?: number;
  total_fees_due?: number;
  fee_source?: string;
  class: string;
  stream?: string;
  scholarship_type?: string;
  scholarship_percentage?: number;
  status: string;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
  created_at: string;
}

interface SchoolOption {
  id: string;
  name: string;
  code: string;
}

const STREAMS = ['General', 'Arts', 'Sciences', 'Business', 'Technical'];
const SCHOLARSHIP_TYPES = ['Full', 'Partial', 'Merit', 'Need-based', 'Sports'];

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'admin';
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [oneOffCharges, setOneOffCharges] = useState<any[]>([]);
  const [markPaidAssignment, setMarkPaidAssignment] = useState<any>(null);
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPagination, setPaymentPagination] = useState(
    normalizePaginationMeta({}),
  );
  const [termPaymentStatus, setTermPaymentStatus] = useState<any>(null);
  const [loadingTermStatus, setLoadingTermStatus] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [classChangeStudent, setClassChangeStudent] = useState<Student | null>(null);
  const [newClass, setNewClass] = useState('');
  const [classChangeConfirmOpen, setClassChangeConfirmOpen] = useState(false);
  const [changingClass, setChangingClass] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    class: '',
    stream: '',
    school_fees_amount: '',
    scholarship_type: '',
    scholarship_percentage: '',
    status: 'active',
    parent_first_name: '',
    parent_last_name: '',
    parent_phone: '',
  });
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [deleteStudent, setDeleteStudent] = useState<Student | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkSchool = async () => {
      try {
        if (isPlatformAdmin) {
          const res = await schoolsAPI.list(1, 200);
          setSchools(res.data.data || []);
          setSchoolSetupRequired(false);
        } else {
          await schoolsAPI.getMySchool();
        }
      } catch (error: any) {
        if (!isPlatformAdmin && error?.response?.status === 404) {
          setSchoolSetupRequired(true);
        }
      } finally {
        setSchoolChecked(true);
      }
    };
    if (user) {
      checkSchool();
    }
  }, [user, isPlatformAdmin]);

  useEffect(() => {
    if (!schoolChecked || schoolSetupRequired) {
      setLoading(false);
      return;
    }
    if (isPlatformAdmin && !selectedSchoolId) {
      setStudents([]);
      setLoading(false);
      return;
    }
    fetchStudents();
  }, [currentPage, schoolChecked, schoolSetupRequired, selectedSchoolId, isPlatformAdmin, debouncedSearch]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const fetchStudents = async () => {
    if (schoolSetupRequired) return;
    if (isPlatformAdmin && !selectedSchoolId) return;
    try {
      setLoading(true);
      const response = await studentsAPI.list(
        currentPage,
        DEFAULT_PAGE_SIZE,
        isPlatformAdmin ? selectedSchoolId : undefined,
        debouncedSearch || undefined,
      );
      const body = response.data;
      const studentsData: Student[] = Array.isArray(body?.data)
        ? body.data
        : Array.isArray(body)
          ? body
          : [];
      const meta = normalizePaginationMeta(body ?? {}, currentPage);
      setStudents(studentsData);
      setTotalStudents(meta.total);
      setTotalPages(meta.totalPages);
    } catch (error: any) {
      toast.error('Failed to fetch students', {
        description: error.response?.data?.error || error.message || 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExampleExcel = () => {
    const exampleData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone': '+256700123456',
        'Class': 'Nursery',
        'Stream': 'General',
        'School Fees Amount': '350000',
        'Scholarship Type': '',
        'Scholarship Percentage': '',
        'Parent First Name': 'Jane',
        'Parent Last Name': 'Doe',
        'Parent Phone': '+256700123457',
      },
      {
        'First Name': 'Mary',
        'Last Name': 'Smith',
        'Phone': '+256700123458',
        'Class': 'KG1',
        'Stream': 'General',
        'School Fees Amount': '250000',
        'Scholarship Type': 'Merit',
        'Scholarship Percentage': '50',
        'Parent First Name': 'Robert',
        'Parent Last Name': 'Smith',
        'Parent Phone': '+256700123459',
      },
      {
        'First Name': 'Peter',
        'Last Name': 'Johnson',
        'Phone': '+256700123460',
        'Class': 'S6',
        'Stream': 'Arts',
        'School Fees Amount': '500000',
        'Scholarship Type': '',
        'Scholarship Percentage': '',
        'Parent First Name': 'Grace',
        'Parent Last Name': 'Johnson',
        'Parent Phone': '+256700123461',
      },
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exampleData);
    const columnWidths = [
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
    ];
    worksheet['!cols'] = columnWidths;

    const instructions = XLSX.utils.aoa_to_sheet([
      ['Column', 'Required', 'Notes'],
      ['First Name', 'Yes', 'Student first name'],
      ['Last Name', 'Yes', 'Student last name'],
      ['Phone', 'Yes*', 'Student phone, or leave blank if Parent Phone is provided'],
      ['Class', 'Yes', 'Free text (e.g. P1, KG1, Nursery)'],
      ['Stream', 'No', 'General, Arts, Sciences, Business, Technical'],
      ['School Fees Amount', 'No', 'Per-student override. Leave blank to use class fee'],
      ['Scholarship Type', 'No', 'Full, Partial, Merit, Need-based, Sports'],
      ['Scholarship Percentage', 'No', 'e.g. 50 for 50%'],
      ['Parent First Name', 'No', ''],
      ['Parent Last Name', 'No', ''],
      ['Parent Phone', 'Yes*', 'Required if student Phone is blank'],
    ]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instructions');
    XLSX.writeFile(workbook, 'student_import_example.xlsx');
    toast.success('Example Excel file downloaded');
  };

  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
    setLoadingPayments(true);
    setPaymentSummary(null);
    setPaymentHistory([]);
    setOneOffCharges([]);
    setPaymentPage(1);
    setPaymentPagination(normalizePaginationMeta({}));
    setTermPaymentStatus(null);
    setSelectedAcademicYear('');
    setSelectedTerm('');

    try {
      const [summaryRes, oneOffRes] = await Promise.all([
        paymentsAPI.getSummary(student.id),
        oneOffChargesAPI.listForStudent(student.id),
      ]);
      setPaymentSummary(summaryRes.data.data);
      setOneOffCharges(oneOffRes.data.data || []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load student payment details'));
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (!showViewModal || !selectedStudent) return;
    const studentId = selectedStudent.id;
    const page = paymentPage;
    let cancelled = false;
    const loadPaymentHistory = async () => {
      try {
        setLoadingPayments(true);
        const response = await paymentsAPI.listByStudent(
          studentId,
          page,
          DEFAULT_PAGE_SIZE,
        );
        if (cancelled) return;
        const body = response.data;
        setPaymentHistory(Array.isArray(body?.data) ? body.data : []);
        setPaymentPagination(normalizePaginationMeta(body ?? {}, page));
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err, 'Failed to load payment history'));
        }
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    };
    void loadPaymentHistory();
    return () => {
      cancelled = true;
    };
  }, [paymentPage, selectedStudent, showViewModal]);

  const handleCheckTermPayment = async () => {
    if (!selectedStudent || !selectedAcademicYear || !selectedTerm) {
      toast.error('Please select both academic year and term');
      return;
    }

    setLoadingTermStatus(true);
    try {
      const response = await paymentsAPI.getTermStatus(
        selectedStudent.id,
        selectedAcademicYear,
        selectedTerm
      );
      setTermPaymentStatus(response.data.data);
      toast.success('Term payment status loaded');
    } catch (error: any) {
      toast.error('Failed to load term payment status', {
        description: error.response?.data?.error || error.message || 'Unknown error',
      });
    } finally {
      setLoadingTermStatus(false);
    }
  };

  const handleMarkOneOffPaid = async () => {
    if (!markPaidAssignment || !selectedStudent) return;
    try {
      setActionLoading(true);
      await oneOffChargesAPI.markPaid(markPaidAssignment.id, {
        note: markPaidNote.trim() || undefined,
        external_ref: markPaidReference.trim() || undefined,
      });
      const [summaryRes, oneOffRes] = await Promise.all([
        paymentsAPI.getSummary(selectedStudent.id),
        oneOffChargesAPI.listForStudent(selectedStudent.id),
      ]);
      setPaymentSummary(summaryRes.data.data);
      setOneOffCharges(oneOffRes.data.data || []);
      setMarkPaidAssignment(null);
      setMarkPaidNote('');
      setMarkPaidReference('');
      toast.success('One-off charge marked as paid');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to mark one-off charge as paid'));
    } finally {
      setActionLoading(false);
    }
  };

  // Generate academic years (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 3 }, (_, i) => String(currentYear - i));
  
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  const openEditStudent = async (student: Student) => {
    try {
      const res = await studentsAPI.get(student.id);
      const data = res.data.data;
      setEditStudent(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        class: data.class || '',
        stream: data.stream || '',
        school_fees_amount:
          data.school_fees_amount !== undefined && data.school_fees_amount !== null
            ? String(data.school_fees_amount)
            : '',
        scholarship_type: data.scholarship_type || '',
        scholarship_percentage:
          data.scholarship_percentage !== undefined && data.scholarship_percentage !== null
            ? String(data.scholarship_percentage)
            : '',
        status: data.status || 'active',
        parent_first_name: data.parent_first_name || '',
        parent_last_name: data.parent_last_name || '',
        parent_phone: data.parent_phone || '',
      });
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to load student'));
    }
  };

  const buildUpdatePayload = () => {
    if (!editStudent) return {};
    const payload: Record<string, unknown> = {};
    if (editForm.first_name !== editStudent.first_name) payload.first_name = editForm.first_name;
    if (editForm.last_name !== editStudent.last_name) payload.last_name = editForm.last_name;
    if ((editForm.phone || '') !== (editStudent.phone || '')) payload.phone = editForm.phone || '';
    if (editForm.class !== editStudent.class) payload.class = editForm.class;
    if ((editForm.stream || '') !== (editStudent.stream || '')) {
      payload.stream = editForm.stream || '';
    }
    const originalFees =
      editStudent.school_fees_amount !== undefined && editStudent.school_fees_amount !== null
        ? String(editStudent.school_fees_amount)
        : '';
    if (editForm.school_fees_amount !== originalFees) {
      if (editForm.school_fees_amount.trim() === '') {
        payload.clear_school_fees_amount = true;
      } else {
        payload.school_fees_amount = parseFloat(editForm.school_fees_amount);
      }
    }
    if ((editForm.scholarship_type || '') !== (editStudent.scholarship_type || '')) {
      payload.scholarship_type = editForm.scholarship_type || '';
    }
    const originalPct =
      editStudent.scholarship_percentage !== undefined && editStudent.scholarship_percentage !== null
        ? String(editStudent.scholarship_percentage)
        : '';
    if (editForm.scholarship_percentage !== originalPct) {
      payload.scholarship_percentage = editForm.scholarship_percentage
        ? parseFloat(editForm.scholarship_percentage)
        : 0;
    }
    if (editForm.status !== editStudent.status) payload.status = editForm.status;
    if ((editForm.parent_first_name || '') !== (editStudent.parent_first_name || '')) {
      payload.parent_first_name = editForm.parent_first_name || null;
    }
    if ((editForm.parent_last_name || '') !== (editStudent.parent_last_name || '')) {
      payload.parent_last_name = editForm.parent_last_name || null;
    }
    if ((editForm.parent_phone || '') !== (editStudent.parent_phone || '')) {
      payload.parent_phone = editForm.parent_phone || null;
    }
    return payload;
  };

  const hasSensitiveEditChanges = () => {
    if (!editStudent) return false;
    const originalFees =
      editStudent.school_fees_amount !== undefined && editStudent.school_fees_amount !== null
        ? String(editStudent.school_fees_amount)
        : '';
    const originalPct =
      editStudent.scholarship_percentage !== undefined && editStudent.scholarship_percentage !== null
        ? String(editStudent.scholarship_percentage)
        : '';
    return (
      editForm.class !== editStudent.class ||
      (editForm.stream || '') !== (editStudent.stream || '') ||
      editForm.school_fees_amount !== originalFees ||
      (editForm.scholarship_type || '') !== (editStudent.scholarship_type || '') ||
      editForm.scholarship_percentage !== originalPct ||
      editForm.status !== editStudent.status
    );
  };

  const submitEdit = async () => {
    if (!editStudent) return;
    const payload = buildUpdatePayload();
    if (Object.keys(payload).length === 0) {
      toast.error('No changes to save');
      setEditConfirmOpen(false);
      return;
    }
    try {
      setActionLoading(true);
      await studentsAPI.update(editStudent.id, payload);
      toast.success('Student updated');
      setEditConfirmOpen(false);
      setEditStudent(null);
      fetchStudents();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to update student'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteStudent) return;
    try {
      setActionLoading(true);
      await studentsAPI.delete(deleteStudent.id);
      toast.success('Student deleted');
      setDeleteStudent(null);
      fetchStudents();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to delete student'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          {schoolSetupRequired && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">School setup required</CardTitle>
                <CardDescription className="text-amber-800">
                  This account is active, but no school is linked yet. Complete school onboarding before managing students.
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Students</h1>
              <p className="mt-2 text-muted-foreground">
                {isPlatformAdmin
                  ? 'Manage students across schools (select a school to continue)'
                  : "Manage your school's students"}
              </p>
            </div>
            <div className="flex gap-2">
              {!isPlatformAdmin && (
                <>
                  <Button
                    variant="outline"
                    onClick={downloadExampleExcel}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Example Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/students/import')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import from Excel
                  </Button>
                  <Button onClick={() => router.push('/dashboard/students/add')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Student
                  </Button>
                </>
              )}
            </div>
          </div>

          {isPlatformAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>School</CardTitle>
                <CardDescription>Select a school to list and manage its students.</CardDescription>
              </CardHeader>
              <CardContent className="max-w-md">
                <Select
                  value={selectedSchoolId || undefined}
                  onValueChange={(value) => {
                    setSelectedSchoolId(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name} ({school.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>
                    {totalStudents} {totalStudents === 1 ? 'student' : 'students'} total
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {isPlatformAdmin && !selectedSchoolId
                      ? 'Select a school to view students'
                      : searchTerm
                        ? 'No students found matching your search'
                        : 'No students found'}
                  </p>
                  {!searchTerm && !isPlatformAdmin && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/students/add')}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Student
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/students/import')}
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Import from Excel
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Registration ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>School Fees</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.registration_id}
                            </TableCell>
                            <TableCell>
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell>{student.phone}</TableCell>
                            <TableCell>
                              {student.resolved_school_fees !== undefined && student.resolved_school_fees !== null ? (
                                <span className="font-medium">
                                  UGX {student.resolved_school_fees.toLocaleString()}
                                  {student.fee_source === 'student_override' ? (
                                    <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                                  ) : student.fee_source === 'class_fee' ? (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      {student.scholarship_percentage
                                        ? `(class − ${student.scholarship_percentage}% scholarship)`
                                        : '(class)'}
                                    </span>
                                  ) : null}
                                </span>
                              ) : student.school_fees_amount !== undefined && student.school_fees_amount !== null ? (
                                <span className="font-medium">
                                  UGX {student.school_fees_amount.toLocaleString()}
                                  <span className="ml-1 text-xs text-muted-foreground">(override)</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.class}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  student.status === 'active' ? 'default' : 'secondary'
                                }
                              >
                                {student.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Change class"
                                  onClick={() => {
                                    setClassChangeStudent(student);
                                    setNewClass(student.class);
                                  }}
                                >
                                  <GraduationCap className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Edit student"
                                  onClick={() => openEditStudent(student)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  title="Delete student"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteStudent(student)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewStudent(student)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <ListPagination
                    className="mt-4"
                    page={currentPage}
                    totalPages={totalPages}
                    total={totalStudents}
                    loading={loading}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* View Student Modal */}
        <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
              <DialogDescription>
                View detailed information about this student
              </DialogDescription>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6">
                {/* Student Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Student Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Registration ID
                      </label>
                      <p className="text-sm font-medium">{selectedStudent.registration_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            selectedStudent.status === 'active' ? 'default' : 'secondary'
                          }
                        >
                          {selectedStudent.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        First Name
                      </label>
                      <p className="text-sm font-medium">{selectedStudent.first_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Name</label>
                      <p className="text-sm font-medium">{selectedStudent.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <p className="text-sm font-medium">{selectedStudent.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">School Fees</label>
                      <p className="text-sm font-medium">
                        {selectedStudent.resolved_school_fees !== undefined && selectedStudent.resolved_school_fees !== null
                          ? `UGX ${selectedStudent.resolved_school_fees.toLocaleString()}`
                          : selectedStudent.school_fees_amount !== undefined && selectedStudent.school_fees_amount !== null
                          ? `UGX ${selectedStudent.school_fees_amount.toLocaleString()}`
                          : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedStudent.fee_source === 'student_override'
                          ? 'Source: student override'
                          : selectedStudent.fee_source === 'class_fee'
                            ? selectedStudent.scholarship_percentage
                              ? `Source: class fee with ${selectedStudent.scholarship_percentage}% scholarship`
                              : 'Source: class fee'
                            : selectedStudent.school_fees_amount != null
                              ? 'Source: student override'
                              : 'Source: none'}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Class</label>
                      <div className="mt-1">
                        <Badge variant="outline">{selectedStudent.class}</Badge>
                      </div>
                    </div>
                    {selectedStudent.stream && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Stream</label>
                        <div className="mt-1">
                          <Badge variant="outline" className="bg-purple-100 text-purple-700">
                            {selectedStudent.stream}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scholarship Information */}
                {(selectedStudent.scholarship_type || selectedStudent.scholarship_percentage) && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Scholarship Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedStudent.scholarship_type && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Scholarship Type
                          </label>
                          <div className="mt-1">
                            <Badge className="bg-green-100 text-green-700">
                              {selectedStudent.scholarship_type}
                            </Badge>
                          </div>
                        </div>
                      )}
                      {selectedStudent.scholarship_percentage !== undefined && selectedStudent.scholarship_percentage > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Discount
                          </label>
                          <p className="text-sm font-medium text-green-600">
                            {selectedStudent.scholarship_percentage}% off fees
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Parent Information */}
                {(selectedStudent.parent_first_name ||
                  selectedStudent.parent_last_name ||
                  selectedStudent.parent_phone) && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Parent Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedStudent.parent_first_name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Parent First Name
                          </label>
                          <p className="text-sm font-medium">
                            {selectedStudent.parent_first_name}
                          </p>
                        </div>
                      )}
                      {selectedStudent.parent_last_name && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Parent Last Name
                          </label>
                          <p className="text-sm font-medium">
                            {selectedStudent.parent_last_name}
                          </p>
                        </div>
                      )}
                      {selectedStudent.parent_phone && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Parent Phone
                          </label>
                          <p className="text-sm font-medium">{selectedStudent.parent_phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Summary
                  </h3>
                  {loadingPayments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : paymentSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4">
                          <label className="text-xs font-medium text-muted-foreground">
                            School Fees
                          </label>
                          <p className="text-lg font-semibold mt-1">
                            {paymentSummary.currency || 'UGX'}{' '}
                            {(paymentSummary.school_fees_amount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-4">
                          <label className="text-xs font-medium text-muted-foreground">
                            Total Fees
                          </label>
                          <p className="text-lg font-semibold mt-1">
                            {paymentSummary.currency || 'UGX'}{' '}
                            {paymentSummary.total_fees?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <label className="text-xs font-medium text-muted-foreground">
                            Total Paid
                          </label>
                          <p className="text-lg font-semibold text-green-700 mt-1">
                            {paymentSummary.currency || 'UGX'}{' '}
                            {paymentSummary.total_paid?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                          <label className="text-xs font-medium text-muted-foreground">
                            Outstanding
                          </label>
                          <p className="text-lg font-semibold text-orange-700 mt-1">
                            {paymentSummary.currency || 'UGX'}{' '}
                            {paymentSummary.outstanding?.toLocaleString() || '0'}
                          </p>
                        </div>
                        {paymentSummary.one_off_outstanding !== undefined && (
                          <div className="bg-rose-50 rounded-lg p-4">
                            <label className="text-xs font-medium text-muted-foreground">
                              One-off Outstanding
                            </label>
                            <p className="text-lg font-semibold text-rose-700 mt-1">
                              {paymentSummary.currency || 'UGX'}{' '}
                              {paymentSummary.one_off_outstanding.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div className="bg-blue-50 rounded-lg p-4">
                          <label className="text-xs font-medium text-muted-foreground">
                            Payment Status
                          </label>
                          <div className="mt-1">
                            <Badge
                              variant={
                                paymentSummary.payment_status === 'full'
                                  ? 'default'
                                  : paymentSummary.payment_status === 'partial'
                                    ? 'secondary'
                                    : 'destructive'
                              }
                              className="text-xs"
                            >
                              {paymentSummary.payment_status === 'full' && (
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                              )}
                              {paymentSummary.payment_status === 'partial' && (
                                <Clock className="mr-1 h-3 w-3" />
                              )}
                              {paymentSummary.payment_status === 'outstanding' && (
                                <XCircle className="mr-1 h-3 w-3" />
                              )}
                              {paymentSummary.payment_status || 'outstanding'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {paymentSummary.last_payment_at && (
                        <div className="text-sm text-muted-foreground">
                          Last payment: {new Date(paymentSummary.last_payment_at).toLocaleString()}
                        </div>
                      )}
                      {Array.isArray(paymentSummary.fees) && paymentSummary.fees.length > 0 && (
                        <div className="rounded-lg border bg-white p-4">
                          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Fee Breakdown
                          </h4>
                          <div className="space-y-2">
                            {paymentSummary.fees.map((fee: any) => (
                              <div key={`${fee.fee_id || fee.fee_name}-${fee.fee_type || 'fee'}`} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                                <div>
                                  <p className="font-medium">
                                    {fee.fee_name}
                                    {fee.fee_type === 'school_fees' ? ' (School Fees)' : fee.fee_type ? ' (Other Fee)' : ''}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Paid: UGX {(fee.paid || 0).toLocaleString()} · Outstanding: UGX {(fee.outstanding || 0).toLocaleString()}
                                  </p>
                                </div>
                                <div className="text-right font-semibold">
                                  UGX {(fee.amount || 0).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment data available</p>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">One-off charges</h3>
                  {oneOffCharges.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No one-off charges assigned.</p>
                  ) : (
                    <div className="rounded-lg border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Charge</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment details</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {oneOffCharges.map((charge) => (
                            <TableRow key={charge.id}>
                              <TableCell className="font-medium">{charge.charge_name}</TableCell>
                              <TableCell>{charge.currency || 'UGX'} {Number(charge.amount || 0).toLocaleString()}</TableCell>
                              <TableCell><Badge variant={charge.status === 'paid' ? 'default' : charge.status === 'waived' ? 'secondary' : 'outline'}>{charge.status}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {charge.paid_at ? new Date(charge.paid_at).toLocaleString() : '-'}
                                {charge.payment_reference ? ` · ${charge.payment_reference}` : ''}
                              </TableCell>
                              <TableCell className="text-right">
                                {charge.status === 'unpaid' ? (
                                  <Button size="sm" variant="outline" onClick={() => {
                                    setMarkPaidAssignment(charge);
                                    setMarkPaidNote('');
                                    setMarkPaidReference('');
                                  }}>Mark as paid</Button>
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                {/* Term Payment Status Check */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Check Term Payment Status
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Academic Year</label>
                        <Select
                          value={selectedAcademicYear}
                          onValueChange={setSelectedAcademicYear}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select academic year" />
                          </SelectTrigger>
                          <SelectContent>
                            {academicYears.map((year) => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Term</label>
                        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {terms.map((term) => (
                              <SelectItem key={term} value={term}>
                                {term}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={handleCheckTermPayment}
                      disabled={loadingTermStatus || !selectedAcademicYear || !selectedTerm}
                      className="w-full"
                    >
                      {loadingTermStatus ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Check Payment Status
                        </>
                      )}
                    </Button>

                    {termPaymentStatus && (
                      <div className="mt-6 space-y-4 border rounded-lg p-4 bg-muted/30">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">
                            {termPaymentStatus.academic_year} - {termPaymentStatus.term}
                          </h4>
                          <Badge
                            variant={
                              termPaymentStatus.payment_status === 'full'
                                ? 'default'
                                : termPaymentStatus.payment_status === 'partial'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {termPaymentStatus.payment_status === 'full' && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {termPaymentStatus.payment_status === 'partial' && (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {termPaymentStatus.payment_status === 'outstanding' && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {termPaymentStatus.payment_status || 'outstanding'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Total Fees
                            </label>
                            <p className="text-sm font-semibold mt-1">
                              UGX {termPaymentStatus.total_fees?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Total Paid
                            </label>
                            <p className="text-sm font-semibold text-green-700 mt-1">
                              UGX {termPaymentStatus.total_paid?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground">
                              Outstanding
                            </label>
                            <p className="text-sm font-semibold text-orange-700 mt-1">
                              UGX {termPaymentStatus.outstanding?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                        {termPaymentStatus.fees && termPaymentStatus.fees.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-semibold mb-2">Fee Breakdown:</h5>
                            <div className="space-y-2">
                              {termPaymentStatus.fees.map((fee: any) => (
                                <div
                                  key={fee.fee_id}
                                  className="flex items-center justify-between p-2 bg-background rounded border"
                                >
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{fee.fee_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      UGX {fee.amount?.toLocaleString()} | Paid: UGX{' '}
                                      {fee.paid?.toLocaleString()} | Outstanding: UGX{' '}
                                      {fee.outstanding?.toLocaleString()}
                                    </p>
                                  </div>
                                  <div>
                                    {fee.is_paid ? (
                                      <Badge variant="default" className="bg-green-600">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Unpaid
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment History */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                  {loadingPayments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : paymentHistory.length > 0 ? (
                    <div className="space-y-3">
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Reference</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Fee</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paymentHistory.map((payment) => (
                              <TableRow key={payment.id}>
                                <TableCell>
                                  {payment.paid_at
                                    ? new Date(payment.paid_at).toLocaleDateString()
                                    : new Date(payment.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {payment.reference}
                                </TableCell>
                                <TableCell>
                                  {payment.currency} {payment.amount?.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  {payment.fee_name || (
                                    <span className="text-muted-foreground">General</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{payment.payment_method}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      payment.status === 'completed'
                                        ? 'default'
                                        : payment.status === 'pending'
                                          ? 'secondary'
                                          : 'destructive'
                                    }
                                  >
                                    {payment.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <ListPagination
                        page={paymentPage}
                        totalPages={paymentPagination.totalPages}
                        total={paymentPagination.total}
                        loading={loadingPayments}
                        onPageChange={setPaymentPage}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No payment history available
                    </p>
                  )}
                </div>

                {/* Created At */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-muted-foreground">
                    Created At
                  </label>
                  <p className="text-sm font-medium">
                    {new Date(selectedStudent.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!markPaidAssignment}
          onOpenChange={(open) => {
            if (!open) setMarkPaidAssignment(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark one-off charge as paid</DialogTitle>
              <DialogDescription>
                Confirm the offline payment for {markPaidAssignment?.charge_name}. This marks the full assigned amount as paid.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="one-off-payment-reference">External reference (optional)</Label>
                <Input id="one-off-payment-reference" value={markPaidReference} onChange={(e) => setMarkPaidReference(e.target.value)} placeholder="Receipt or transaction reference" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="one-off-payment-note">Note (optional)</Label>
                <Input id="one-off-payment-note" value={markPaidNote} onChange={(e) => setMarkPaidNote(e.target.value)} placeholder="Payment note" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMarkPaidAssignment(null)}>Cancel</Button>
              <Button disabled={actionLoading} onClick={handleMarkOneOffPaid}>Mark as paid</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!classChangeStudent}
          onOpenChange={(open) => {
            if (!open) {
              setClassChangeStudent(null);
              setNewClass('');
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change student class</DialogTitle>
              <DialogDescription>
                {classChangeStudent
                  ? `Update class for ${classChangeStudent.first_name} ${classChangeStudent.last_name}. Fee resolution will follow the new class.`
                  : 'Update student class'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="new-class">New class</Label>
              <Input
                id="new-class"
                value={newClass}
                onChange={(e) => setNewClass(e.target.value)}
                placeholder="e.g. P2, KG1, S1"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setClassChangeStudent(null);
                  setNewClass('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newClass.trim()) {
                    toast.error('Enter a class name');
                    return;
                  }
                  if (classChangeStudent && newClass.trim() === classChangeStudent.class) {
                    toast.error('Choose a different class');
                    return;
                  }
                  setClassChangeConfirmOpen(true);
                }}
                className="bg-[#08163d] hover:bg-[#0a1f4f] text-white"
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={classChangeConfirmOpen}
          onOpenChange={setClassChangeConfirmOpen}
          description={
            classChangeStudent
              ? `Are you sure you want to move ${classChangeStudent.first_name} ${classChangeStudent.last_name} from ${classChangeStudent.class} to ${newClass.trim()}?`
              : 'Are you sure you want to change this student\'s class?'
          }
          confirmLabel="Change class"
          loading={changingClass}
          onConfirm={async () => {
            if (!classChangeStudent) return;
            try {
              setChangingClass(true);
              await studentsAPI.changeClass(classChangeStudent.id, newClass.trim());
              toast.success('Student class updated');
              setClassChangeConfirmOpen(false);
              setClassChangeStudent(null);
              setNewClass('');
              fetchStudents();
            } catch (error: unknown) {
              toast.error(getApiErrorMessage(error, 'Failed to change class'));
            } finally {
              setChangingClass(false);
            }
          }}
        />

        <Dialog
          open={!!editStudent}
          onOpenChange={(open) => {
            if (!open) setEditStudent(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit student</DialogTitle>
              <DialogDescription>
                Registration ID cannot be changed. Changing class, fees, scholarship, or status requires confirmation.
              </DialogDescription>
            </DialogHeader>
            {editStudent && (
              <div className="grid gap-4 py-2 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Registration ID</Label>
                  <Input value={editStudent.registration_id} disabled />
                </div>
                <div className="space-y-2">
                  <Label>First name</Label>
                  <Input
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last name</Label>
                  <Input
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Input
                    value={editForm.class}
                    onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Select
                    value={editForm.stream || 'none'}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, stream: value === 'none' ? '' : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Stream" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {STREAMS.map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="inactive">inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>School fees override</Label>
                  <Input
                    type="number"
                    value={editForm.school_fees_amount}
                    onChange={(e) =>
                      setEditForm({ ...editForm, school_fees_amount: e.target.value })
                    }
                    placeholder="Leave blank to use class fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Scholarship type</Label>
                  <Select
                    value={editForm.scholarship_type || 'none'}
                    onValueChange={(value) =>
                      setEditForm({
                        ...editForm,
                        scholarship_type: value === 'none' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SCHOLARSHIP_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Scholarship %</Label>
                  <Input
                    type="number"
                    value={editForm.scholarship_percentage}
                    onChange={(e) =>
                      setEditForm({ ...editForm, scholarship_percentage: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent first name</Label>
                  <Input
                    value={editForm.parent_first_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, parent_first_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Parent last name</Label>
                  <Input
                    value={editForm.parent_last_name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, parent_last_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Parent phone</Label>
                  <Input
                    value={editForm.parent_phone}
                    onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditStudent(null)}>
                Cancel
              </Button>
              <Button
                className="bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                onClick={() => {
                  if (hasSensitiveEditChanges()) {
                    setEditConfirmOpen(true);
                    return;
                  }
                  void submitEdit();
                }}
              >
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={editConfirmOpen}
          onOpenChange={setEditConfirmOpen}
          description="Are you sure you want to change class, stream, fees, scholarship, and/or status? This can change what the student owes."
          confirmLabel="Save changes"
          loading={actionLoading}
          onConfirm={submitEdit}
        />

        <ConfirmDialog
          open={!!deleteStudent}
          onOpenChange={(open) => {
            if (!open) setDeleteStudent(null);
          }}
          description={
            deleteStudent
              ? `Are you sure you want to delete ${deleteStudent.first_name} ${deleteStudent.last_name}?`
              : 'Are you sure you want to delete this student?'
          }
          confirmLabel="Delete"
          variant="destructive"
          loading={actionLoading}
          onConfirm={handleDeleteStudent}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
