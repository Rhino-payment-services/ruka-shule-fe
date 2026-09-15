'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { adminAPI, API_BASE_URL } from '@/lib/api';
import { CreditCard, User, School, Banknote, CircleDot, Calendar, Receipt } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListPagination } from '@/components/ListPagination';
import { LoadingState } from '@/components/LoadingState';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import {
  DataTableShell,
  StatusPill,
  TableHeadLabel,
  toneFromStatus,
} from '@/components/data-table';

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadPayments();
  }, [page]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listPayments(page, DEFAULT_PAGE_SIZE);
      setPayments(res.data.data || []);
      setTotal(res.data.total ?? 0);
      setTotalPages(normalizePaginationMeta(res.data).totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">All payments across all schools</p>

          <DataTableShell
            title="All Payments"
            description={`${total} total transactions`}
            footer={
              payments.length > 0 ? (
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {loading ? (
              <LoadingState label="Loading payments…" className="py-10" />
            ) : payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-400">No payments yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={User}>Student</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={School}>School</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Banknote}>Amount</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Date</TableHeadLabel>
                    </TableHead>
                    <TableHead className="text-right">
                      <TableHeadLabel icon={Receipt} className="justify-end">
                        Receipt
                      </TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const isCompleted = p.status === 'completed' || p.status === 'paid';
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-[#08163d]">
                          {p.student_name || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="text-[#08163d]">{p.school_name || '—'}</div>
                            {p.school_code && (
                              <div className="font-mono text-[11px] text-slate-400">
                                {p.school_code}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-[#08163d]">
                          {p.currency} {p.amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneFromStatus(p.status)} dot>
                            {p.status}
                          </StatusPill>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
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
                              className="text-xs font-medium text-[#08163d] hover:underline"
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
            )}
          </DataTableShell>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
