'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paymentsAPI, schoolsAPI } from '@/lib/api';
import { Loader2, RefreshCcw, Landmark } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolProfile {
  bank_name?: string;
  bank_code?: string;
  bank_account_name?: string;
  bank_account_number?: string;
}

interface SettlementSummary {
  available_for_settlement: number;
  total_collected: number;
  total_settled: number;
  pending_settlements: number;
}

interface SettlementRow {
  id: string;
  parent_settlement_id?: string;
  reference: string;
  transaction_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  retry_count: number;
  failure_reason?: string;
  settled_at?: string;
  created_at: string;
}

export default function SettlementsPage() {
  const defaultPageSize = 20;
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const hasBankProfile = !!(school?.bank_name && school?.bank_account_name && school?.bank_account_number);

  const loadData = async (nextPage = page) => {
    try {
      setLoading(true);
      const [settlementsRes, schoolRes] = await Promise.all([
        paymentsAPI.listSettlements(nextPage, defaultPageSize),
        schoolsAPI.getMySchool(),
      ]);

      const data = settlementsRes.data?.data || {};
      setSettlements(data.settlements || []);
      setSummary(data.summary || null);
      setPage(data.page || nextPage);
      setTotalPages(data.total_pages || 1);
      setSchool(schoolRes.data?.data || null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const runSettlement = async () => {
    try {
      if (!hasBankProfile) {
        toast.error('School bank profile is incomplete. Please add bank details first.');
        return;
      }

      setRunning(true);
      const amount = amountInput.trim() ? parseFloat(amountInput) : undefined;
      if (amountInput.trim() && (!amount || amount <= 0)) {
        toast.error('Enter a valid settlement amount');
        return;
      }
      await paymentsAPI.runSettlement(amount);
      toast.success('Settlement initiated');
      setAmountInput('');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to run settlement');
    } finally {
      setRunning(false);
    }
  };

  const retrySettlement = async (id: string) => {
    try {
      setRetryingId(id);
      await paymentsAPI.retrySettlement(id);
      toast.success('Settlement retry submitted');
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to retry settlement');
    } finally {
      setRetryingId(null);
    }
  };

  const formatCurrency = (value: number, currency = 'UGX') => `${currency} ${value.toLocaleString()}`;
  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

  const statusBadge = (status: SettlementRow['status']) => {
    if (status === 'completed') return <Badge className="bg-green-500">Completed</Badge>;
    if (status === 'processing') return <Badge className="bg-blue-500">Processing</Badge>;
    if (status === 'failed') return <Badge className="bg-red-500">Failed</Badge>;
    return <Badge className="bg-yellow-500">Pending</Badge>;
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settlements</h1>
            <p className="mt-2 text-muted-foreground">
              Transfer collected school fees from your business wallet to the school bank account.
            </p>
          </div>

          <Card className={!hasBankProfile ? 'border-amber-300' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Bank Profile
              </CardTitle>
              <CardDescription>
                Settlements require bank name, account name, and account number. Bank code is optional but recommended.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Bank:</span> {school?.bank_name || '—'}</p>
              <p><span className="text-muted-foreground">Bank Code:</span> {school?.bank_code || '—'}</p>
              <p><span className="text-muted-foreground">Account Name:</span> {school?.bank_account_name || '—'}</p>
              <p><span className="text-muted-foreground">Account Number:</span> {school?.bank_account_number || '—'}</p>
              {!hasBankProfile && (
                <p className="pt-2 text-amber-700">
                  Bank profile incomplete. Add these details in school onboarding/profile before running settlements.
                </p>
              )}
              {hasBankProfile && !school?.bank_code && (
                <p className="pt-2 text-amber-700">
                  Bank code is missing. Settlement may still work depending on partner, but adding bank code improves reliability.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-bold">{formatCurrency(summary?.available_for_settlement || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold">{formatCurrency(summary?.total_collected || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Settled</p><p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_settled || 0)}</p></CardContent></Card>
            <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.pending_settlements || 0)}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Run Settlement</CardTitle>
              <CardDescription>Leave amount empty to settle full available amount.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Optional amount (UGX)"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              <Button onClick={runSettlement} disabled={running || loading || !hasBankProfile}>
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Settlement'}
              </Button>
              <Button variant="outline" onClick={() => loadData()} disabled={loading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settlement History</CardTitle>
              <CardDescription>Track payout status and retry failed settlements.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Settled</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : settlements.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No settlements yet.</TableCell></TableRow>
                  ) : (
                    settlements.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">
                          <div className="space-y-1">
                            <div>{row.reference}</div>
                            {row.parent_settlement_id && (
                              <Badge variant="outline" className="text-[10px]">
                                Retry Attempt
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(row.amount, row.currency)}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell>{row.retry_count}</TableCell>
                        <TableCell>{formatDate(row.created_at)}</TableCell>
                        <TableCell>{formatDate(row.settled_at)}</TableCell>
                        <TableCell>
                          {row.status === 'failed' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={retryingId === row.id}
                              onClick={() => retrySettlement(row.id)}
                            >
                              {retryingId === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Retry'}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">{row.failure_reason || '—'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <p>Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || page <= 1}
                    onClick={() => loadData(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading || page >= totalPages}
                    onClick={() => loadData(page + 1)}
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
