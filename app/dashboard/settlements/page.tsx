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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Loader2, RefreshCcw, Landmark } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';

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
  status: 'pending' | 'processing' | 'escrow_funded' | 'completed' | 'failed';
  amount: number;
  currency: string;
  retry_count: number;
  failure_reason?: string;
  settled_at?: string;
  created_at: string;
}

export default function SettlementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [retryConfirmId, setRetryConfirmId] = useState<string | null>(null);

  const hasBankProfile = !!(
    school?.bank_name &&
    school?.bank_code &&
    school?.bank_account_name &&
    school?.bank_account_number
  );

  const loadData = async (nextPage = page) => {
    if (schoolSetupRequired) return;
    try {
      setLoading(true);
      const [settlementsRes, schoolRes] = await Promise.all([
        paymentsAPI.listSettlements(nextPage, DEFAULT_PAGE_SIZE),
        schoolsAPI.getMySchool(),
      ]);

      const data = settlementsRes.data?.data;
      setSettlements(data?.settlements || []);
      setSummary(data?.summary || null);
      const meta = normalizePaginationMeta(data || {}, nextPage);
      setPage(meta.page);
      setTotalPages(meta.totalPages);
      setSchool(schoolRes.data?.data || null);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkSchool = async () => {
      try {
        await schoolsAPI.getMySchool();
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
    loadData();
  }, [page, schoolChecked, schoolSetupRequired]);

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
      setRunConfirmOpen(false);
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
      setRetryConfirmId(null);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to retry settlement');
    } finally {
      setRetryingId(null);
    }
  };

  const openRunConfirm = () => {
    if (!hasBankProfile) {
      toast.error('School bank profile is incomplete. Please add bank details first.');
      return;
    }
    const amount = amountInput.trim() ? parseFloat(amountInput) : undefined;
    if (amountInput.trim() && (!amount || amount <= 0)) {
      toast.error('Enter a valid settlement amount');
      return;
    }
    setRunConfirmOpen(true);
  };

  const formatCurrency = (value: number, currency = 'UGX') => `${currency} ${value.toLocaleString()}`;
  const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : '—');

  const statusBadge = (status: SettlementRow['status']) => {
    if (status === 'completed') return <Badge className="bg-green-500">Completed</Badge>;
    if (status === 'processing') return <Badge className="bg-blue-500">Processing</Badge>;
    if (status === 'escrow_funded') return <Badge className="bg-amber-500">Escrow funded</Badge>;
    if (status === 'failed') return <Badge className="bg-red-500">Failed</Badge>;
    return <Badge className="bg-yellow-500">Pending</Badge>;
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
                  This account is active, but no school is linked yet. Complete school onboarding before running settlements.
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
                Settlements require bank name, bank code, account name, and account number.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p><span className="text-muted-foreground">Bank:</span> {school?.bank_name || '—'}</p>
              <p><span className="text-muted-foreground">Bank Code:</span> {school?.bank_code || '—'}</p>
              <p><span className="text-muted-foreground">Account Name:</span> {school?.bank_account_name || '—'}</p>
              <p><span className="text-muted-foreground">Account Number:</span> {school?.bank_account_number || '—'}</p>
              {!hasBankProfile && (
                <p className="pt-2 text-amber-700">
                  Bank profile incomplete. Add bank name, bank code, account name, and account number before running settlements.
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
              <Button onClick={openRunConfirm} disabled={running || loading || !hasBankProfile}>
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
                          {row.status === 'failed' || row.status === 'escrow_funded' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={retryingId === row.id}
                              onClick={() => setRetryConfirmId(row.id)}
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
              <ListPagination
                className="mt-4"
                page={page}
                totalPages={totalPages}
                loading={loading}
                onPageChange={setPage}
              />
            </CardContent>
          </Card>

          <ConfirmDialog
            open={runConfirmOpen}
            onOpenChange={setRunConfirmOpen}
            description={
              amountInput.trim()
                ? `Are you sure you want to transfer UGX ${Number(amountInput).toLocaleString()} from the school business wallet to the configured bank account?`
                : 'Are you sure you want to transfer the full available balance from the school business wallet to the configured bank account?'
            }
            confirmLabel="Run settlement"
            loading={running}
            onConfirm={runSettlement}
          />

          <ConfirmDialog
            open={!!retryConfirmId}
            onOpenChange={(open) => {
              if (!open) setRetryConfirmId(null);
            }}
            description="Are you sure you want to retry this settlement payout?"
            confirmLabel="Retry"
            loading={!!retryingId}
            onConfirm={async () => {
              if (retryConfirmId) await retrySettlement(retryConfirmId);
            }}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
