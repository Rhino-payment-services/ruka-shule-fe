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
import { LoadingState } from '@/components/LoadingState';
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
  business_wallet_balance?: number;
  escrow_balance?: number;
  escrow_wallet_id?: string;
}

interface SettlementRow {
  id: string;
  parent_settlement_id?: string;
  reference: string;
  escrow_transaction_id?: string;
  transaction_id?: string;
  status: 'pending' | 'processing' | 'escrow_funded' | 'completed' | 'failed';
  amount: number;
  currency: string;
  retry_count: number;
  failure_reason?: string;
  settled_at?: string;
  created_at: string;
}

function parseAmount(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return Number(trimmed);
}

export default function SettlementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [funding, setFunding] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [fundAmountInput, setFundAmountInput] = useState('');
  const [fundError, setFundError] = useState('');
  const [runError, setRunError] = useState('');
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [fundConfirmOpen, setFundConfirmOpen] = useState(false);

  const hasBankProfile = !!(
    school?.bank_name &&
    school?.bank_code &&
    school?.bank_account_name &&
    school?.bank_account_number
  );

  const availableBusiness = summary?.available_for_settlement ?? 0;
  const escrowBalance = summary?.escrow_balance ?? 0;

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

  const validateFundAmount = (raw: string): { amount?: number; error?: string } => {
    const amount = parseAmount(raw);
    if (raw.trim()) {
      if (!Number.isFinite(amount) || amount === undefined) {
        return { error: 'Enter a valid amount greater than zero.' };
      }
      if (amount <= 0) {
        return { error: 'Amount must be greater than zero.' };
      }
      if (amount > availableBusiness) {
        return {
          error: `Not enough business-wallet funds. Available: UGX ${availableBusiness.toLocaleString()}.`,
        };
      }
      return { amount };
    }
    if (availableBusiness <= 0) {
      return { error: 'No funds available in the business wallet to move to escrow.' };
    }
    return { amount: undefined };
  };

  const validateRunAmount = (raw: string): { amount?: number; error?: string } => {
    const amount = parseAmount(raw);
    if (raw.trim()) {
      if (!Number.isFinite(amount) || amount === undefined) {
        return { error: 'Enter a valid amount greater than zero.' };
      }
      if (amount <= 0) {
        return { error: 'Amount must be greater than zero.' };
      }
      if (amount > escrowBalance) {
        return {
          error: `Not enough escrow funds. Escrow balance: UGX ${escrowBalance.toLocaleString()}.`,
        };
      }
      return { amount };
    }
    if (escrowBalance <= 0) {
      return { error: 'No funds available in escrow. Fund escrow first, then send to bank.' };
    }
    return { amount: undefined };
  };

  const openFundConfirm = () => {
    const result = validateFundAmount(fundAmountInput);
    if (result.error) {
      setFundError(result.error);
      toast.error(result.error);
      return;
    }
    setFundError('');
    setFundConfirmOpen(true);
  };

  const openRunConfirm = () => {
    if (!hasBankProfile) {
      toast.error('School bank profile is incomplete. Please add bank details first.');
      return;
    }
    const result = validateRunAmount(amountInput);
    if (result.error) {
      setRunError(result.error);
      toast.error(result.error);
      return;
    }
    setRunError('');
    setRunConfirmOpen(true);
  };

  const fundEscrow = async () => {
    const result = validateFundAmount(fundAmountInput);
    if (result.error) {
      setFundError(result.error);
      toast.error(result.error);
      setFundConfirmOpen(false);
      return;
    }
    try {
      setFunding(true);
      await paymentsAPI.fundSettlementEscrow(result.amount);
      toast.success('Escrow funded successfully');
      setFundAmountInput('');
      setFundError('');
      setFundConfirmOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to fund escrow');
    } finally {
      setFunding(false);
    }
  };

  const runSettlement = async () => {
    if (!hasBankProfile) {
      toast.error('School bank profile is incomplete. Please add bank details first.');
      setRunConfirmOpen(false);
      return;
    }
    const result = validateRunAmount(amountInput);
    if (result.error) {
      setRunError(result.error);
      toast.error(result.error);
      setRunConfirmOpen(false);
      return;
    }
    try {
      setRunning(true);
      await paymentsAPI.runSettlement(result.amount);
      toast.success('Bank payout initiated');
      setAmountInput('');
      setRunError('');
      setRunConfirmOpen(false);
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send escrow to bank');
    } finally {
      setRunning(false);
    }
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
              Fund the school escrow wallet first, then send the amount you choose from escrow to the school bank account.
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

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Available to settle</p>
                <p className="text-2xl font-bold">{formatCurrency(availableBusiness)}</p>
                <p className="mt-1 text-xs text-muted-foreground">From business wallet</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Business wallet</p>
                <p className="text-2xl font-bold">
                  {summary?.business_wallet_balance !== undefined && summary?.business_wallet_balance !== null
                    ? formatCurrency(summary.business_wallet_balance)
                    : '—'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Escrow wallet</p>
                <p className="text-2xl font-bold text-amber-700">{formatCurrency(escrowBalance)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Held before bank payout</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Settled</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.total_settled || 0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary?.pending_settlements || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>1. Fund escrow</CardTitle>
              <CardDescription>
                Move money from the school business wallet into escrow. Leave empty to move the full available balance
                ({formatCurrency(availableBusiness)}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  max={availableBusiness}
                  placeholder={`Available: ${availableBusiness.toLocaleString()} UGX`}
                  value={fundAmountInput}
                  onChange={(e) => {
                    setFundAmountInput(e.target.value);
                    setFundError('');
                  }}
                />
                <Button
                  onClick={openFundConfirm}
                  disabled={funding || loading || availableBusiness <= 0}
                >
                  {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fund escrow'}
                </Button>
                <Button variant="outline" onClick={() => loadData()} disabled={loading}>
                  <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {fundError && <p className="text-sm text-red-600">{fundError}</p>}
              {availableBusiness <= 0 && !fundError && (
                <p className="text-sm text-muted-foreground">No business-wallet funds available to move into escrow.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Send escrow to bank</CardTitle>
              <CardDescription>
                Choose how much of the escrow balance to send to the bank. Leave empty to send the full escrow balance
                ({formatCurrency(escrowBalance)}).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  max={escrowBalance}
                  placeholder={`Escrow: ${escrowBalance.toLocaleString()} UGX`}
                  value={amountInput}
                  onChange={(e) => {
                    setAmountInput(e.target.value);
                    setRunError('');
                  }}
                />
                <Button
                  onClick={openRunConfirm}
                  disabled={running || loading || !hasBankProfile || escrowBalance <= 0}
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send to bank'}
                </Button>
              </div>
              {runError && <p className="text-sm text-red-600">{runError}</p>}
              {!hasBankProfile && (
                <p className="text-sm text-amber-700">Complete the bank profile before sending to bank.</p>
              )}
              {hasBankProfile && escrowBalance <= 0 && !runError && (
                <p className="text-sm text-muted-foreground">Escrow is empty. Fund escrow first, then send to bank.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Settlement History</CardTitle>
              <CardDescription>Track escrow funding and bank payout status.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Settled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <LoadingState label="Loading settlements…" className="py-8" />
                      </TableCell>
                    </TableRow>
                  ) : settlements.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No settlements yet.</TableCell></TableRow>
                  ) : (
                    settlements.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-mono text-xs">{row.reference}</TableCell>
                        <TableCell>{formatCurrency(row.amount, row.currency)}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell>{formatDate(row.created_at)}</TableCell>
                        <TableCell>{formatDate(row.settled_at)}</TableCell>
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
            open={fundConfirmOpen}
            onOpenChange={setFundConfirmOpen}
            description={
              fundAmountInput.trim()
                ? `Move UGX ${Number(fundAmountInput).toLocaleString()} from the school business wallet into escrow?`
                : `Move the full available balance (UGX ${availableBusiness.toLocaleString()}) into escrow?`
            }
            confirmLabel="Fund escrow"
            loading={funding}
            onConfirm={fundEscrow}
          />

          <ConfirmDialog
            open={runConfirmOpen}
            onOpenChange={setRunConfirmOpen}
            description={
              amountInput.trim()
                ? `Send UGX ${Number(amountInput).toLocaleString()} from escrow to the configured bank account?`
                : `Send the full escrow balance (UGX ${escrowBalance.toLocaleString()}) to the configured bank account?`
            }
            confirmLabel="Send to bank"
            loading={running}
            onConfirm={runSettlement}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
