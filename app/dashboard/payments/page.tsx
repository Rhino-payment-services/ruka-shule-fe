'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreditCard, Search, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { paymentsAPI, studentsAPI } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  payment_method: string;
  student_id: string;
  student_name?: string;
  fee_name?: string;
  paid_at?: string;
  created_at: string;
}

interface StudentPaymentSummary {
  student_id: string;
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

  useEffect(() => {
    loadPayments();
  }, [page]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentsAPI.list(page, pageSize);
      const paymentsData = response.data.data?.data || response.data.data || [];
      setPayments(paymentsData);
      // Try to get total count if available
      if (response.data.data?.total !== undefined) {
        setTotalPayments(response.data.data.total);
      } else {
        setTotalPayments(paymentsData.length);
      }
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
      // Try to find student by student_id, phone, or name
      const lookupParams: { student_id?: string; phone?: string; school_code?: string } = {};
      
      // Check if it looks like a student ID
      if (searchQuery.match(/^[A-Z0-9-]+$/)) {
        lookupParams.student_id = searchQuery;
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'failed':
      case 'error':
        return <Badge className="bg-red-500 hover:bg-red-600"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
      case 'processing':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
          </div>

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
                      <p className="text-xs text-muted-foreground">ID: {searchResults.student_id}</p>
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
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Transactions
              </CardTitle>
              <CardDescription>All payment transactions for your school</CardDescription>
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
                            <TableCell className="font-mono text-sm">{payment.reference}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{payment.student_name || 'N/A'}</p>
                                <p className="text-xs text-muted-foreground">ID: {payment.student_id}</p>
                              </div>
                            </TableCell>
                            <TableCell>{payment.fee_name || 'N/A'}</TableCell>
                            <TableCell className="font-semibold">
                              {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>{payment.payment_method || 'N/A'}</TableCell>
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
