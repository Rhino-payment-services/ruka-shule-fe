'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusPill, toneFromStatus, DataTableShell, TableHeadLabel } from '@/components/data-table';
import { StatSummaryCard } from '@/components/dashboard/StatSummaryCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { paymentsAPI, schoolsAPI } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { LoadingState } from '@/components/LoadingState';
import {
  Loader2,
  RefreshCcw,
  Landmark,
  Wallet,
  CircleDollarSign,
  Clock,
  Hash,
  Calendar,
  CircleDot,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

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
  const { user } = useAuth();
  const canWriteSettlements = hasPermission(user, PERMISSIONS.settlementsWrite);
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
    const label =
      status === 'escrow_funded'
        ? 'Escrow funded'
        : status.charAt(0).toUpperCase() + status.slice(1);
    const tone =
      status === 'escrow_funded' ? 'warning' : toneFromStatus(status);
    return (
      <StatusPill tone={tone} dot>
        {label}
      </StatusPill>
    );
  };

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.settlementsRead}>
      <DashboardLayout>
        <div className="space-y-4">
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

          <p className="text-xs text-slate-500">
            Fund the school escrow wallet first, then send the amount you choose from escrow to the school bank account.
          </p>

          <div
            className={`overflow-hidden rounded-2xl bg-white px-4 py-3.5 shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ${
              !hasBankProfile ? 'ring-amber-300' : 'ring-black/3'
            }`}
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#08163d]/5">
                <Landmark className="h-4 w-4 text-[#08163d]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#08163d]">Bank Profile</h2>
                <p className="text-xs text-slate-400">
                  Settlements require bank name, bank code, account name, and account number.
                </p>
              </div>
            </div>
            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <p>
                <span className="text-slate-400">Bank:</span>{' '}
                <span className="text-[#08163d]">{school?.bank_name || '—'}</span>
              </p>
              <p>
                <span className="text-slate-400">Bank Code:</span>{' '}
                <span className="text-[#08163d]">{school?.bank_code || '—'}</span>
              </p>
              <p>
                <span className="text-slate-400">Account Name:</span>{' '}
                <span className="text-[#08163d]">{school?.bank_account_name || '—'}</span>
              </p>
              <p>
                <span className="text-slate-400">Account Number:</span>{' '}
                <span className="text-[#08163d]">{school?.bank_account_number || '—'}</span>
              </p>
            </div>
            {!hasBankProfile && (
              <p className="pt-2 text-xs text-amber-700">
                Bank profile incomplete. Add bank name, bank code, account name, and account number before running settlements.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <StatSummaryCard
              title="Available to settle"
              value={formatCurrency(availableBusiness)}
              description="From business wallet"
              icon={Wallet}
              accent="navy"
            />
            <StatSummaryCard
              title="Business wallet"
              value={
                summary?.business_wallet_balance !== undefined && summary?.business_wallet_balance !== null
                  ? formatCurrency(summary.business_wallet_balance)
                  : '—'
              }
              icon={CircleDollarSign}
              accent="muted"
            />
            <StatSummaryCard
              title="Escrow wallet"
              value={formatCurrency(escrowBalance)}
              description="Held before bank payout"
              icon={Wallet}
              accent="gold"
            />
            <StatSummaryCard
              title="Settled"
              value={formatCurrency(summary?.total_settled || 0)}
              icon={CircleDollarSign}
              accent="emerald"
            />
            <StatSummaryCard
              title="Pending"
              value={formatCurrency(summary?.pending_settlements || 0)}
              icon={Clock}
              accent="gold"
            />
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="text-sm font-semibold text-[#08163d]">1. Fund escrow</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Move money from the school business wallet into escrow. Leave empty to move the full available balance (
                {formatCurrency(availableBusiness)}).
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  className="h-10 rounded-full border-0 bg-[#F8F9FB] shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-[#E8A317]/35"
                />
                {canWriteSettlements && (
                <Button
                  onClick={openFundConfirm}
                  disabled={funding || loading || availableBusiness <= 0}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {funding ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fund escrow'}
                </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => loadData()}
                  disabled={loading}
                  className="h-9 rounded-full border-slate-200"
                >
                  <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              {fundError && <p className="text-sm text-red-600">{fundError}</p>}
              {availableBusiness <= 0 && !fundError && (
                <p className="text-xs text-slate-400">No business-wallet funds available to move into escrow.</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="text-sm font-semibold text-[#08163d]">2. Send escrow to bank</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Choose how much of the escrow balance to send to the bank. Leave empty to send the full escrow balance (
                {formatCurrency(escrowBalance)}).
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                  className="h-10 rounded-full border-0 bg-[#F8F9FB] shadow-none ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-[#E8A317]/35"
                />
                {canWriteSettlements && (
                <Button
                  onClick={openRunConfirm}
                  disabled={running || loading || !hasBankProfile || escrowBalance <= 0}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send to bank'}
                </Button>
                )}
              </div>
              {runError && <p className="text-sm text-red-600">{runError}</p>}
              {!hasBankProfile && (
                <p className="text-xs text-amber-700">Complete the bank profile before sending to bank.</p>
              )}
              {hasBankProfile && escrowBalance <= 0 && !runError && (
                <p className="text-xs text-slate-400">Escrow is empty. Fund escrow first, then send to bank.</p>
              )}
            </div>
          </div>

          <DataTableShell
            title="Settlement History"
            description="Track escrow funding and bank payout status."
            footer={
              <ListPagination
                page={page}
                totalPages={totalPages}
                loading={loading}
                onPageChange={setPage}
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <TableHeadLabel icon={Hash}>Reference</TableHeadLabel>
                  </TableHead>
                  <TableHead>
                    <TableHeadLabel>Amount</TableHeadLabel>
                  </TableHead>
                  <TableHead>
                    <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                  </TableHead>
                  <TableHead>
                    <TableHeadLabel icon={Calendar}>Created</TableHeadLabel>
                  </TableHead>
                  <TableHead>
                    <TableHeadLabel icon={Calendar}>Settled</TableHeadLabel>
                  </TableHead>
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
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-slate-400">
                      No settlements yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  settlements.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs text-slate-500">{row.reference}</TableCell>
                      <TableCell className="text-sm font-medium text-[#08163d]">
                        {formatCurrency(row.amount, row.currency)}
                      </TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(row.created_at)}</TableCell>
                      <TableCell className="text-xs text-slate-400">{formatDate(row.settled_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DataTableShell>

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
