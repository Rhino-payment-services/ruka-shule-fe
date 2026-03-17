'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { adminAPI, API_BASE_URL } from '@/lib/api';
import { CreditCard, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  student_name?: string;
  school_name?: string;
  school_code?: string;
  created_at: string;
}

export default function PlatformPaymentsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadPayments();
  }, [page]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listPayments(page, pageSize);
      setPayments(res.data.data || []);
      setTotal(res.data.total ?? 0);
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const StatusIcon = (status: string) => {
    if (status === 'completed' || status === 'paid') return CheckCircle;
    if (status === 'failed') return XCircle;
    return Clock;
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">
                Platform Payments
              </h1>
              <p className="mt-2 text-muted-foreground">
                All payments across all schools
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                All Payments
              </CardTitle>
              <CardDescription>
                {total} total transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading payments...</div>
                </div>
              ) : payments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="font-medium text-muted-foreground">No payments yet</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20">
                        <TableHead className="font-semibold">Student</TableHead>
                        <TableHead className="font-semibold">School</TableHead>
                        <TableHead className="font-semibold">Amount</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Date</TableHead>
                        <TableHead className="text-right font-semibold">Receipt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p) => {
                        const Icon = StatusIcon(p.status);
                        const isCompleted = p.status === 'completed' || p.status === 'paid';
                        return (
                          <TableRow key={p.id} className="hover:bg-primary/5">
                            <TableCell className="font-medium">{p.student_name || '—'}</TableCell>
                            <TableCell>
                              <div>
                                <div>{p.school_name || '—'}</div>
                                {p.school_code && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {p.school_code}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {p.currency} {p.amount?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={
                                  isCompleted
                                    ? 'bg-green-100 text-green-700'
                                    : p.status === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }
                              >
                                <Icon className="mr-1 h-3 w-3 inline" />
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {p.created_at
                                ? new Date(p.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {isCompleted && (
                                <a
                                  href={`${API_BASE_URL}/receipts/${p.reference}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  Receipt
                                </a>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1}
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
