'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCard, Search, CheckCircle, XCircle, Clock, Loader2, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentsAPI, studentsAPI, schoolsAPI, API_BASE_URL } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FeeForPayment {
  id: string;
  name: string;
  amount: number;
  currency: string;
  total_paid: number;
  outstanding: number;
  is_paid: boolean;
}

interface StudentLookupData {
  student: {
    id: string;
    registration_id: string;
    full_name: string;
    class: string;
    phone: string;
  };
  school: {
    code: string;
    name: string;
  };
  available_fees: FeeForPayment[];
  payment_summary: {
    total_fees: number;
    total_paid: number;
    total_outstanding: number;
    carry_forward_balance?: number;
    payment_status: string;
  };
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  payment_method: string;
  registration_id: string;
  student_name?: string;
  fee_name?: string;
  school_name?: string;
  school_code?: string;
  paid_at?: string;
  created_at: string;
}

interface StudentPaymentSummary {
  registration_id: string;
  student_name: string;
  class: string;
  total_paid: number;
  total_fees: number;
  outstanding: number;
  payment_status: string;
  payment_count: number;
  last_payment_at?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentPaymentSummary | null>(null);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPayments, setTotalPayments] = useState(0);

  // Collect Payment state
  const [schoolCode, setSchoolCode] = useState<string>('');
  const [lookupRegistrationId, setLookupRegistrationId] = useState('');
  const [studentLookupData, setStudentLookupData] = useState<StudentLookupData | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeForPayment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [page]);

  useEffect(() => {
    const fetchSchool = async () => {
      try {
        const res = await schoolsAPI.getMySchool();
        const school = res.data.data;
        if (school?.code) setSchoolCode(school.code);
      } catch {
        // School admin may not have school in some edge cases
      }
    };
    fetchSchool();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.list(page, pageSize);
      // Backend returns PaginatedResponse: { data, page, page_size, total, total_pages }
      const paymentsData = response.data.data || [];
      const total = response.data.total;
      setPayments(paymentsData);
      setTotalPayments(total !== undefined ? total : paymentsData.length);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      setSearching(true);
      // Try to find student by registration_id, phone, or name
      const lookupParams: { registration_id?: string; phone?: string; school_code?: string } = {};
      
      // Check if it looks like a registration ID
      if (searchQuery.match(/^[A-Z0-9-]+$/)) {
        lookupParams.registration_id = searchQuery;
      } else if (searchQuery.match(/^\+?[0-9]+$/)) {
        // Looks like a phone number
        lookupParams.phone = searchQuery;
      }
      
      // Try student lookup first
      try {
        const studentRes = await studentsAPI.lookup(lookupParams);
        const student = studentRes.data.data;
        
        if (student && student.id) {
          // Get payment summary for this student
          const summaryRes = await paymentsAPI.getSummary(student.id);
          setSearchResults(summaryRes.data.data);
        } else {
          setSearchResults(null);
        }
      } catch (err) {
        console.error('Student lookup failed:', err);
        setSearchResults(null);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults(null);
    } finally {
      setSearching(false);
    }
  };

  const handlePaymentLookup = async () => {
    if (!lookupRegistrationId.trim() || !schoolCode) {
      toast.error(schoolCode ? 'Enter student registration ID' : 'School not loaded');
      return;
    }
    try {
      setLookupLoading(true);
      setStudentLookupData(null);
      const res = await paymentsAPI.lookupStudentForPayment(lookupRegistrationId.trim(), schoolCode);
      const data = res.data.data;
      setStudentLookupData(data);
      setPaymentPhone(data?.student?.phone || '');
      // Auto-select first outstanding fee so admin can pay immediately
      const payableFees = (data?.available_fees || []).filter((f: FeeForPayment) => !f.is_paid && f.outstanding > 0);
      if (payableFees.length > 0) {
        setSelectedFee(payableFees[0]);
        setPaymentAmount(payableFees[0].outstanding.toString());
      } else {
        setSelectedFee(null);
        setPaymentAmount('');
      }
      toast.success('Student found');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(axiosErr.response?.data?.error || 'Student not found');
      setStudentLookupData(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!studentLookupData || !selectedFee || !paymentAmount || !paymentPhone) {
      toast.error('Fill all required fields');
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amount > selectedFee.outstanding) {
      toast.error(`Amount cannot exceed UGX ${selectedFee.outstanding.toLocaleString()}`);
      return;
    }
    const phone = paymentPhone.replace(/\D/g, '');
    if (phone.length < 9) {
      toast.error('Enter a valid phone number');
      return;
    }
    const formattedPhone = phone.startsWith('256') ? `+${phone}` : `+256${phone}`;

    try {
      setProcessingPayment(true);
      setPaymentReference(null);
      const res = await paymentsAPI.processPayment({
        registration_id: studentLookupData.student.registration_id,
        school_code: studentLookupData.school.code,
        fee_id: selectedFee.id,
        class: studentLookupData.student.class,
        amount,
        currency: 'UGX',
        payment_method: 'MOBILE_MONEY',
        phone_number: formattedPhone,
        description: `School fees: ${selectedFee.name}`,
      });
      const payment = res.data.data;
      setPaymentReference(payment.reference);
      toast.success('Payment initiated. Check your phone to complete.');
      // Refresh list immediately so new payment appears without manual refresh
      loadPayments();
      // Poll for status
      let pollCount = 0;
      const maxPolls = 40; // 2 minutes
      const pollInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollInterval);
          setProcessingPayment(false);
          return;
        }
        try {
          const statusRes = await paymentsAPI.getStatus(payment.reference);
          const status = (statusRes.data.data?.status || '').toLowerCase();
          if (status === 'completed' || status === 'paid') {
            clearInterval(pollInterval);
            toast.success('Payment completed!');
            setProcessingPayment(false);
            loadPayments();
            handlePaymentLookup();
          } else if (status === 'failed' || status === 'cancelled') {
            clearInterval(pollInterval);
            toast.error(`Payment ${status}`);
            setProcessingPayment(false);
          }
        } catch {
          // Ignore poll errors
        }
      }, 3000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(axiosErr.response?.data?.error || 'Payment failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const resetPaymentFlow = () => {
    setStudentLookupData(null);
    setSelectedFee(null);
    setPaymentAmount('');
    setPaymentReference(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500 hover:bg-blue-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processing</Badge>;
      case 'failed':
      case 'error':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="h-3 w-3 mr-1" />Initiated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Payments</h1>
            <p className="mt-2 text-muted-foreground">View and manage payment transactions</p>
            {payments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalPayments || payments.length}</span> total payment(s)
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {payments.filter((p) => p.status === 'pending' || p.status === 'processing').length}
                  </span> pending
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-green-600">
                    {payments.filter((p) => p.status === 'completed' || p.status === 'paid').length}
                  </span> completed
                </span>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <Link href="/dashboard/settlements">Go to Settlements</Link>
            </Button>
          </div>

          {/* Collect Payment Card */}
          <Card className="border-2 border-emerald-200 bg-gradient-to-br from-white to-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                Collect Payment
              </CardTitle>
              <CardDescription>
                Look up a student and collect school fees via Mobile Money
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1: Lookup */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-medium">Student Registration ID</label>
                  <Input
                    placeholder="e.g. STU001"
                    value={lookupRegistrationId}
                    onChange={(e) => setLookupRegistrationId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePaymentLookup()}
                  />
                </div>
                {schoolCode && studentLookupData?.school?.name && (
                  <div className="text-sm text-muted-foreground">
                    School: {studentLookupData.school.name} ({schoolCode})
                  </div>
                )}
                {schoolCode && !studentLookupData && (
                  <div className="text-sm text-muted-foreground">School: {schoolCode}</div>
                )}
                <Button
                  onClick={handlePaymentLookup}
                  disabled={lookupLoading || !schoolCode}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {lookupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Lookup
                    </>
                  )}
                </Button>
              </div>

              {/* Step 2: Fees & Payment */}
              {studentLookupData && (
                  <div className="mt-4 space-y-4 rounded-lg border border-emerald-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {studentLookupData.student.full_name} — {studentLookupData.student.class}
                      </h3>
                      {studentLookupData.school?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{studentLookupData.school.name}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetPaymentFlow}>
                      Change student
                    </Button>
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carry-forward</span>
                      <span className="font-semibold text-amber-700">
                        UGX {(studentLookupData.payment_summary.carry_forward_balance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total outstanding</span>
                      <span className="font-semibold text-red-600">
                        UGX {studentLookupData.payment_summary.total_outstanding.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select fee to pay</label>
                    <div className="grid gap-2">
                      {studentLookupData.available_fees
                        .filter((f) => !f.is_paid && f.outstanding > 0)
                        .map((fee) => (
                          <button
                            key={fee.id}
                            type="button"
                            onClick={() => {
                              setSelectedFee(fee);
                              setPaymentAmount(fee.outstanding.toString());
                            }}
                            className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition-colors ${
                              selectedFee?.id === fee.id
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <div>
                              <p className="font-medium">{fee.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Outstanding: UGX {fee.outstanding.toLocaleString()}
                              </p>
                            </div>
                            {selectedFee?.id === fee.id && (
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            )}
                          </button>
                        ))}
                    </div>
                    {studentLookupData.available_fees.filter((f) => !f.is_paid && f.outstanding > 0).length === 0 && (
                      <p className="text-sm text-muted-foreground">All fees are paid.</p>
                    )}
                  </div>

                  {selectedFee && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Amount (UGX)</label>
                          <Input
                            type="number"
                            placeholder="Amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            min={1}
                            max={selectedFee.outstanding}
                          />
                          <p className="text-xs text-muted-foreground">
                            Max: UGX {selectedFee.outstanding.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Phone (Mobile Money)</label>
                          <Input
                            placeholder="256700123456"
                            value={paymentPhone}
                            onChange={(e) => setPaymentPhone(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleProcessPayment}
                          disabled={processingPayment}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {processingPayment ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="h-4 w-4 mr-2" />
                              Pay {paymentAmount && !isNaN(parseFloat(paymentAmount)) ? `UGX ${parseFloat(paymentAmount).toLocaleString()}` : 'Now'}
                            </>
                          )}
                        </Button>
                      </div>
                      {paymentReference && (
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm">
                          <p className="font-medium text-blue-900">Payment initiated</p>
                          <p className="text-blue-700 font-mono">Ref: {paymentReference}</p>
                          <p className="text-blue-600 mt-1">Check the payer&apos;s phone to complete.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!schoolCode && (
                <p className="text-sm text-amber-600">Loading school information...</p>
              )}
            </CardContent>
          </Card>

          {/* Student Search Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Student Payment Status
              </CardTitle>
              <CardDescription>Enter student ID, phone number, or name to check payment status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter student ID, phone, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleStudentSearch();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  onClick={handleStudentSearch}
                  disabled={searching}
                  className="bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                >
                  {searching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-lg mb-3">Payment Summary</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Student</p>
                      <p className="font-semibold">{searchResults.student_name}</p>
                      <p className="text-xs text-muted-foreground">ID: {searchResults.registration_id}</p>
                      <p className="text-xs text-muted-foreground">Class: {searchResults.class}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                      <p className="font-semibold text-lg">UGX {searchResults.total_fees.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="font-semibold text-lg text-green-600">UGX {searchResults.total_paid.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{searchResults.payment_count} payment(s)</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className={`font-semibold text-lg ${searchResults.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        UGX {searchResults.outstanding.toLocaleString()}
                      </p>
                      <Badge
                        className={
                          searchResults.payment_status === 'full'
                            ? 'bg-green-500'
                            : searchResults.payment_status === 'partial'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }
                      >
                        {searchResults.payment_status === 'full'
                          ? 'Fully Paid'
                          : searchResults.payment_status === 'partial'
                          ? 'Partially Paid'
                          : 'Outstanding'}
                      </Badge>
                    </div>
                  </div>
                  {searchResults.last_payment_at && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-sm text-muted-foreground">
                        Last Payment: {formatDate(searchResults.last_payment_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {searchQuery && !searchResults && !searching && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                  No payment information found for this student.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments List Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Transactions
                  </CardTitle>
                  <CardDescription>All payment transactions for your school</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadPayments()}
                  disabled={loading}
                >
                  <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No payments found</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono text-sm">
                              <a
                                href={`${API_BASE_URL}/receipts/${payment.reference}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                                title="View receipt"
                              >
                                {payment.reference}
                              </a>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{payment.student_name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">ID: {payment.registration_id}</p>
                                {payment.school_name && (
                                  <p className="text-xs text-muted-foreground">{payment.school_name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{payment.fee_name || 'N/A'}</TableCell>
                            <TableCell className="font-semibold">
                              {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              {payment.payment_method === 'MOBILE_MONEY' ? 'Mobile Money' : payment.payment_method || 'N/A'}
                            </TableCell>
                            <TableCell>{getStatusBadge(payment.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(payment.paid_at || payment.created_at)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {payments.length} of {totalPayments} payments
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={payments.length < pageSize || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
