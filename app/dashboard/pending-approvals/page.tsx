'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI, adminAPI } from '@/lib/api';
import { School, Hash, Mail, BadgeCheck, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListPagination } from '@/components/ListPagination';
import { ButtonSpinner, LoadingState } from '@/components/LoadingState';
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
  merchant_code?: string;
  business_wallet_id?: string;
  created_at: string;
}

export default function PendingApprovalsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectSchoolId, setRejectSchoolId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveSchoolId, setApproveSchoolId] = useState<string | null>(null);
  const [approveReason, setApproveReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSchools();
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.list(page, DEFAULT_PAGE_SIZE, {
        merchant_status: 'pending',
        search: debouncedSearch || undefined,
      });
      setSchools(response.data.data || []);
      const meta = normalizePaginationMeta(response.data, page);
      setTotal(meta.total);
      setTotalPages(meta.totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (schoolId: string) => {
    setApproveSchoolId(schoolId);
    setApproveReason('');
    setApproveDialogOpen(true);
  };

  const submitApprove = async () => {
    if (!approveSchoolId) return;
    try {
      setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  const openRejectDialog = (schoolId: string) => {
    setRejectSchoolId(schoolId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const submitReject = async () => {
    if (!rejectSchoolId) return;
    try {
      setActionLoading(true);
      await adminAPI.updateMerchantStatus(rejectSchoolId, {
        merchant_status: 'rejected',
        reason: rejectReason || null,
      });
      setRejectDialogOpen(false);
      setRejectSchoolId(null);
      await loadSchools();
      toast.success('School rejected');
    } catch {
      toast.error('Failed to reject school. See console for details.');
    } finally {
      setActionLoading(false);
    }
  };

  const merchantLabel = (status?: string) => {
    if (status === 'kyc_submitted') return 'KYC Submitted';
    if (status === 'pending_onboarding') return 'Pending Onboarding';
    return status || '—';
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Schools awaiting merchant onboarding or KYC approval
          </p>

          <PillSearch
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search schools…"
          />

          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject School Onboarding</DialogTitle>
                <DialogDescription>
                  Optionally provide a reason for rejecting this school&apos;s merchant onboarding.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="space-y-1.5">
                  <Label htmlFor="reject-reason">Rejection reason (optional)</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Enter rejection reason"
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setRejectDialogOpen(false)}
                  className="h-9 rounded-full border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  disabled={actionLoading}
                  onClick={submitReject}
                  className="h-9 rounded-full bg-red-600 px-4 text-white hover:bg-red-700"
                >
                  {actionLoading ? (
                    <>
                      <ButtonSpinner /> Rejecting…
                    </>
                  ) : (
                    'Reject'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve School Onboarding</DialogTitle>
                <DialogDescription>
                  Confirm approval for this school&apos;s merchant onboarding. Optionally add an
                  approval note.
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
                  <Label htmlFor="approve-note">Approval note (optional)</Label>
                  <Textarea
                    id="approve-note"
                    value={approveReason}
                    onChange={(e) => setApproveReason(e.target.value)}
                    placeholder="Enter approval note"
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setApproveDialogOpen(false)}
                  className="h-9 rounded-full border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  disabled={actionLoading}
                  onClick={submitApprove}
                  className="h-9 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700"
                >
                  {actionLoading ? (
                    <>
                      <ButtonSpinner /> Approving…
                    </>
                  ) : (
                    'Confirm Approve'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DataTableShell
            title={`Schools Awaiting Approval (${total})`}
            description="Onboarded schools with pending merchant/wallet setup or submitted KYC"
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
              <LoadingState label="Loading pending approvals…" className="py-10" />
            ) : schools.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-3 rounded-full bg-[#FFF4C2] p-3">
                  <School className="h-7 w-7 text-[#E8A317]" />
                </div>
                <p className="text-sm font-medium text-slate-500">No pending approvals</p>
                <p className="mt-1 text-xs text-slate-400">
                  All schools have completed merchant onboarding
                </p>
                <Button
                  variant="outline"
                  className="mt-4 h-8 rounded-full text-xs"
                  onClick={() => router.push('/dashboard/schools')}
                >
                  View All Schools
                </Button>
              </div>
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
                      <TableHeadLabel icon={BadgeCheck}>Merchant</TableHeadLabel>
                    </TableHead>
                    <TableHead className="text-right">
                      <TableHeadLabel icon={MoreHorizontal} className="justify-end">
                        Actions
                      </TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF4C2]">
                            <School className="h-3.5 w-3.5 text-[#E8A317]" />
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
                        <StatusPill tone={toneFromStatus(school.merchant_status)} dot>
                          {merchantLabel(school.merchant_status)}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleApprove(school.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(school.id)}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                            onClick={() => router.push(`/dashboard/schools/${school.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
