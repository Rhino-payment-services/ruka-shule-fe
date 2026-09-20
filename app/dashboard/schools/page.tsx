'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI, adminAPI } from '@/lib/api';
import {
  School,
  Plus,
  Hash,
  Mail,
  CircleDot,
  Wallet,
  BadgeCheck,
  Calendar,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta, useDebouncedValue } from '@/lib/hooks/useServerPagination';
import {
  DataTableShell,
  PillSearch,
  StatusPill,
  TableHeadLabel,
  toneFromStatus,
} from '@/components/data-table';

interface SchoolData {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  status: string;
  merchant_status?: string;
  business_wallet_id?: string;
  created_at: string;
  updated_at?: string;
}

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveSchoolId, setApproveSchoolId] = useState<string | null>(null);
  const [approveReason, setApproveReason] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadSchools();
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.list(page, DEFAULT_PAGE_SIZE, {
        search: debouncedSearch || undefined,
      });
      const data = response.data.data || [];
      setSchools(data);
      const meta = normalizePaginationMeta(response.data, page);
      setTotal(meta.total);
      setTotalPages(meta.totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRejected = (schoolId: string) => {
    setApproveSchoolId(schoolId);
    setApproveReason('');
    setApproveDialogOpen(true);
  };

  const submitApproveRejected = async () => {
    if (!approveSchoolId) return;
    try {
      setApproving(true);
      await adminAPI.updateMerchantStatus(approveSchoolId, {
        merchant_status: 'approved',
        reason: approveReason || null,
      });
      setApproveDialogOpen(false);
      setApproveSchoolId(null);
      await loadSchools();
      toast.success('School approved successfully');
    } catch {
      toast.error('Failed to approve school. See console for details.');
    } finally {
      setApproving(false);
    }
  };

  const merchantLabel = (status?: string) => {
    if (!status) return '—';
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    if (status === 'kyc_submitted') return 'KYC Submitted';
    return status;
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Manage and onboard schools</p>
            <Button
              onClick={() => router.push('/dashboard/schools/onboard')}
              className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Onboard School
            </Button>
          </div>

          <PillSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search schools…"
          />

          <DataTableShell
            title="All Schools"
            description="List of all registered schools in the system"
            footer={
              <ListPagination
                page={page}
                totalPages={totalPages}
                total={total}
                loading={loading}
                onPageChange={setPage}
              />
            }
          >
            {loading ? (
              <LoadingState label="Loading schools…" className="py-10" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={School}>School</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Hash}>Code</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Mail}>Contact</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={BadgeCheck}>Merchant</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Wallet}>Wallet ID</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Updated</TableHeadLabel>
                    </TableHead>
                    <TableHead className="text-right">
                      <TableHeadLabel icon={MoreHorizontal} className="justify-end">
                        Actions
                      </TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-slate-400">
                        No schools found
                      </TableCell>
                    </TableRow>
                  ) : (
                    schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#08163d]/5">
                              <School className="h-3.5 w-3.5 text-[#08163d]" />
                            </div>
                            <div className="font-medium text-[#08163d]">{school.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">{school.code}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <div className="text-[#08163d]">{school.email}</div>
                            <div className="text-slate-400">{school.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneFromStatus(school.status)} dot>
                            {school.status}
                          </StatusPill>
                        </TableCell>
                        <TableCell>
                          <StatusPill tone={toneFromStatus(school.merchant_status)} dot>
                            {merchantLabel(school.merchant_status)}
                          </StatusPill>
                        </TableCell>
                        <TableCell>
                          <code className="text-[11px] text-slate-500">
                            {school.business_wallet_id || 'N/A'}
                          </code>
                        </TableCell>
                        <TableCell className="text-xs text-slate-400">
                          {school.updated_at
                            ? new Date(school.updated_at).toLocaleDateString()
                            : new Date(school.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {school.merchant_status === 'rejected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                                onClick={() => handleApproveRejected(school.id)}
                              >
                                Re-approve
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-[#08163d] hover:bg-[#FFF4C2]/50"
                              onClick={() => router.push(`/dashboard/schools/${school.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </DataTableShell>

          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Re-approve School</DialogTitle>
                <DialogDescription>
                  Approve this rejected school for merchant onboarding. Optionally add an approval note.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-4">
                <p className="text-sm text-[#08163d]">
                  School:{' '}
                  <span className="font-medium">
                    {approveSchoolId
                      ? (schools.find((s) => s.id === approveSchoolId)?.name ?? '—')
                      : '—'}
                  </span>
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="reapprove-note">Approval note (optional)</Label>
                  <Textarea
                    id="reapprove-note"
                    value={approveReason}
                    onChange={(e) => setApproveReason(e.target.value)}
                    placeholder="Enter approval note"
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(false)}
                  className="h-9 rounded-full border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitApproveRejected}
                  disabled={approving}
                  className="h-9 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                >
                  {approving ? 'Approving...' : 'Approve'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
