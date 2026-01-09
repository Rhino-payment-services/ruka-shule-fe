'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { studentsAPI } from '@/lib/api';
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
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { paymentsAPI } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  class: string;
  stream?: string;  // Arts, Sciences, General, etc.
  scholarship_type?: string;  // Full, Partial, Merit, etc.
  scholarship_percentage?: number;  // Discount percentage
  status: string;
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
  created_at: string;
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [termPaymentStatus, setTermPaymentStatus] = useState<any>(null);
  const [loadingTermStatus, setLoadingTermStatus] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');

  useEffect(() => {
    fetchStudents();
  }, [currentPage]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsAPI.list(currentPage, pageSize);
      
      // Handle both paginated and non-paginated responses
      let studentsData: Student[] = [];
      let totalCount = 0;
      let totalPagesCount = 1;
      
      // Check if response has pagination metadata
      if (response.data.total !== undefined) {
        // Paginated response
        studentsData = response.data.data || [];
        totalCount = response.data.total || 0;
        totalPagesCount = response.data.total_pages || 1;
      } else if (Array.isArray(response.data.data)) {
        // Non-paginated response (fallback)
        studentsData = response.data.data || [];
        totalCount = studentsData.length;
        totalPagesCount = Math.ceil(studentsData.length / pageSize) || 1;
      } else if (Array.isArray(response.data)) {
        // Direct array response (another fallback)
        studentsData = response.data || [];
        totalCount = studentsData.length;
        totalPagesCount = Math.ceil(studentsData.length / pageSize) || 1;
      }
      
      console.log('Fetched students:', {
        count: studentsData.length,
        total: totalCount,
        totalPages: totalPagesCount,
        currentPage,
        pageSize,
      });
      
      setStudents(studentsData);
      setTotalPages(totalPagesCount);
    } catch (error: any) {
      console.error('Error fetching students:', error);
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
        'Registration ID': 'REG2024001',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone': '+256700123456',
        'Class': 'P1',
        'Stream': '',
        'Scholarship Type': '',
        'Scholarship Percentage': '',
        'Parent First Name': 'Jane',
        'Parent Last Name': 'Doe',
        'Parent Phone': '+256700123457',
      },
      {
        'Registration ID': 'REG2024002',
        'First Name': 'Mary',
        'Last Name': 'Smith',
        'Phone': '+256700123458',
        'Class': 'S5',
        'Stream': 'Sciences',
        'Scholarship Type': 'Merit',
        'Scholarship Percentage': '50',
        'Parent First Name': 'Robert',
        'Parent Last Name': 'Smith',
        'Parent Phone': '+256700123459',
      },
      {
        'Registration ID': 'REG2024003',
        'First Name': 'Peter',
        'Last Name': 'Johnson',
        'Phone': '+256700123460',
        'Class': 'S6',
        'Stream': 'Arts',
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
      { wch: 15 }, // Registration ID
      { wch: 12 }, // First Name
      { wch: 12 }, // Last Name
      { wch: 15 }, // Phone
      { wch: 10 }, // Class
      { wch: 12 }, // Stream
      { wch: 16 }, // Scholarship Type
      { wch: 20 }, // Scholarship Percentage
      { wch: 18 }, // Parent First Name
      { wch: 18 }, // Parent Last Name
      { wch: 15 }, // Parent Phone
    ];
    worksheet['!cols'] = columnWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student_import_example.xlsx');
    toast.success('Example Excel file downloaded');
  };

  // Filter students - if searching, show all matching results; otherwise show paginated results
  const filteredStudents = searchTerm.trim()
    ? students.filter((student) => {
        const searchLower = searchTerm.toLowerCase().trim();
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const fullNameReversed = `${student.last_name} ${student.first_name}`.toLowerCase();
        
        return (
          student.registration_id.toLowerCase().includes(searchLower) ||
          student.first_name.toLowerCase().includes(searchLower) ||
          student.last_name.toLowerCase().includes(searchLower) ||
          fullName.includes(searchLower) ||
          fullNameReversed.includes(searchLower) ||
          student.phone.includes(searchTerm) ||
          student.class.toLowerCase().includes(searchLower)
        );
      })
    : students; // When not searching, show paginated results as-is

  const handleViewStudent = async (student: Student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
    setLoadingPayments(true);
    setPaymentSummary(null);
    setPaymentHistory([]);
    setTermPaymentStatus(null);
    setSelectedAcademicYear('');
    setSelectedTerm('');

    try {
      // Fetch payment summary and history in parallel
      const [summaryRes, historyRes] = await Promise.all([
        paymentsAPI.getSummary(student.id),
        paymentsAPI.listByStudent(student.id),
      ]);

      setPaymentSummary(summaryRes.data.data);
      setPaymentHistory(historyRes.data.data || []);
    } catch (error: any) {
      console.error('Error fetching payment data:', error);
      // Don't show error toast - just log it, as student might not have payments yet
    } finally {
      setLoadingPayments(false);
    }
  };

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

  // Generate academic years (current year and previous 2 years)
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 3 }, (_, i) => String(currentYear - i));
  
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Students</h1>
              <p className="mt-2 text-muted-foreground">Manage your school's students</p>
            </div>
            <div className="flex gap-2">
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
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Student Management</CardTitle>
                  <CardDescription>
                    {students.length} {students.length === 1 ? 'student' : 'students'} total
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
              ) : filteredStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'No students found matching your search' : 'No students found'}
                  </p>
                  {!searchTerm && (
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
                          <TableHead>Class</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">
                              {student.registration_id}
                            </TableCell>
                            <TableCell>
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell>{student.phone}</TableCell>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewStudent(student)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {!searchTerm && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {students.length} student{students.length !== 1 ? 's' : ''}
                        {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                      </div>
                      {totalPages > 1 && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || loading}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages || loading}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {searchTerm && filteredStudents.length > 0 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Found {filteredStudents.length} matching student{filteredStudents.length !== 1 ? 's' : ''}
                    </div>
                  )}
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
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No payment data available</p>
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
