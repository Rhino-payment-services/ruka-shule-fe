'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { oneOffChargesAPI, studentsAPI, schoolsAPI } from '@/lib/api';
import { getApiErrorMessage, verifySchoolContextIssue } from '@/lib/api/errors';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PillSearch, StatusPill, toneFromStatus, DataTableShell, TableHeadLabel } from '@/components/data-table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Pencil, List, Trash2, Receipt, CircleDot, Calendar, MoreHorizontal, Hash } from 'lucide-react';
import { ListPagination } from '@/components/ListPagination';
import { ButtonSpinner, LoadingState } from '@/components/LoadingState';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta, useDebouncedValue } from '@/lib/hooks/useServerPagination';

const formatUgx = (amount: number) => `UGX ${Number(amount || 0).toLocaleString()}`;

interface OneOffCharge {
  id: string;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  class?: string | null;
  gender?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

interface StudentOption {
  id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  class: string;
  gender?: string;
}

interface StudentCharge {
  id: string;
  one_off_charge_id?: string;
  charge_name: string;
  student_id?: string;
  amount: number;
  currency: string;
  status: string;
  registration_id?: string;
  student_name?: string;
  gender?: string;
  paid_at?: string;
  payment_reference?: string;
  payment_note?: string;
  external_ref?: string;
  payment_method?: string;
}

export default function OneOffChargesPage() {
  const [charges, setCharges] = useState<OneOffCharge[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [history, setHistory] = useState<StudentCharge[]>([]);
  const [assignments, setAssignments] = useState<StudentCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [chargePagination, setChargePagination] = useState(normalizePaginationMeta({}));
  const [studentSearch, setStudentSearch] = useState('');
  const debouncedStudentSearch = useDebouncedValue(studentSearch);
  const [assignGenderFilter, setAssignGenderFilter] = useState('');
  const [assignClassFilter, setAssignClassFilter] = useState('');
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);
  const [assignPage, setAssignPage] = useState(1);
  const [assignPagination, setAssignPagination] = useState(normalizePaginationMeta({}));
  const [assignLoading, setAssignLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const debouncedHistorySearch = useDebouncedValue(historySearch);
  const [historyClassFilter, setHistoryClassFilter] = useState('');
  const [historyStudents, setHistoryStudents] = useState<StudentOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignmentsOpen, setAssignmentsOpen] = useState(false);
  const [selectedCharge, setSelectedCharge] = useState<OneOffCharge | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [alreadyAssignedIds, setAlreadyAssignedIds] = useState<Set<string>>(new Set());
  const [historyStudentId, setHistoryStudentId] = useState('');
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [waiveConfirmId, setWaiveConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [markPaidAssignment, setMarkPaidAssignment] = useState<StudentCharge | null>(null);
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [markPaidReference, setMarkPaidReference] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    amount: '',
    currency: 'UGX',
    class: '',
    gender: '',
    status: 'active',
  });

  const load = async () => {
    try {
      setLoading(true);
      const schoolRes = await schoolsAPI.getMySchool();
      const classes = schoolRes.data.data?.classes;
      if (Array.isArray(classes)) {
        setSchoolClasses([...classes].sort());
      } else {
        setSchoolClasses([]);
      }
      const chargesRes = await oneOffChargesAPI.list(page, DEFAULT_PAGE_SIZE);
      setCharges(chargesRes.data.data || []);
      setChargePagination(normalizePaginationMeta(chargesRes.data, page));
    } catch (err: unknown) {
      const schoolContext = await verifySchoolContextIssue(err, () => schoolsAPI.getMySchool());
      if (schoolContext === 'missing_school_link') {
        toast.error('This account is not linked to a school yet. Complete school setup before managing additional charges.');
      } else if (schoolContext === 'unexpected_context') {
        toast.error(
          'Your school link exists, but school context could not be verified. Please refresh and try again.',
        );
      } else {
        toast.error(getApiErrorMessage(err, 'Failed to load additional charges'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page]);

  useEffect(() => {
    if (!assignOpen) return;
    const loadAssignStudents = async () => {
      try {
        setAssignLoading(true);
        const response = await studentsAPI.list(
          assignPage,
          DEFAULT_PAGE_SIZE,
          undefined,
          debouncedStudentSearch || undefined,
          assignClassFilter || selectedCharge?.class || undefined,
          assignGenderFilter || selectedCharge?.gender || undefined,
        );
        setStudents(response.data.data || []);
        setAssignPagination(normalizePaginationMeta(response.data, assignPage));
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to load students'));
      } finally {
        setAssignLoading(false);
      }
    };
    void loadAssignStudents();
  }, [assignOpen, assignPage, debouncedStudentSearch, selectedCharge?.class, selectedCharge?.gender, assignClassFilter, assignGenderFilter]);

  useEffect(() => {
    setAssignPage(1);
  }, [debouncedStudentSearch, selectedCharge?.class, selectedCharge?.gender, assignClassFilter, assignGenderFilter]);

  useEffect(() => {
    if (!historyClassFilter) {
      setHistoryStudents([]);
      return;
    }
    const loadHistoryStudents = async () => {
      try {
        const response = await studentsAPI.list(
          1,
          100,
          undefined,
          debouncedHistorySearch || undefined,
          historyClassFilter,
        );
        setHistoryStudents(response.data.data || []);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to load students'));
      }
    };
    void loadHistoryStudents();
  }, [debouncedHistorySearch, historyClassFilter]);

  const handleHistoryClassChange = (value: string) => {
    const nextClass = value === 'all' ? '' : value;
    setHistoryClassFilter(nextClass);
    setHistoryStudentId('');
    setHistory([]);
    setHistorySearch('');
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      amount: '',
      currency: 'UGX',
      class: '',
      gender: '',
      status: 'active',
    });
  };

  const handleCreate = async () => {
    try {
      setSaving(true);
      await oneOffChargesAPI.create({
        name: form.name,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: 'UGX',
        class: form.class || undefined,
        gender: form.gender || undefined,
      });
      toast.success('Additional charge created');
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to create charge'));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (charge: OneOffCharge) => {
    setSelectedCharge(charge);
    setForm({
      name: charge.name,
      description: charge.description || '',
      amount: String(charge.amount),
      currency: 'UGX',
      class: charge.class || '',
      gender: charge.gender || '',
      status: charge.status || 'active',
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedCharge) return;
    try {
      setSaving(true);
      await oneOffChargesAPI.update(selectedCharge.id, {
        name: form.name,
        description: form.description,
        amount: parseFloat(form.amount),
        currency: 'UGX',
        class: form.class || null,
        gender: form.gender || null,
        status: form.status,
      });
      toast.success('Charge updated');
      setEditOpen(false);
      setSelectedCharge(null);
      resetForm();
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to update charge'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setActionLoading(true);
      await oneOffChargesAPI.delete(id);
      toast.success('Additional charge deleted');
      setDeleteConfirmId(null);
      load();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to delete charge'));
    } finally {
      setActionLoading(false);
    }
  };

  const openAssign = async (charge: OneOffCharge) => {
    setSelectedCharge(charge);
    setSelectedStudentIds([]);
    setAssignClassFilter(charge.class || '');
    setAssignGenderFilter(charge.gender || '');
    setStudentSearch('');
    setAssignPage(1);
    setAssignOpen(true);
    try {
      const res = await oneOffChargesAPI.listAssignments(charge.id);
      const assigned = new Set<string>();
      for (const row of res.data.data || []) {
        if (row.student_id && row.status !== 'waived') {
          assigned.add(row.student_id);
        }
      }
      setAlreadyAssignedIds(assigned);
    } catch {
      setAlreadyAssignedIds(new Set());
    }
  };

  const refreshRelatedLists = async (chargeId?: string) => {
    if (chargeId) {
      try {
        const res = await oneOffChargesAPI.listAssignments(chargeId);
        setAssignments(res.data.data || []);
        const assigned = new Set<string>();
        for (const row of res.data.data || []) {
          if (row.student_id && row.status !== 'waived') {
            assigned.add(row.student_id);
          }
        }
        setAlreadyAssignedIds(assigned);
      } catch {
        /* keep existing */
      }
    }
    if (historyStudentId) {
      try {
        const res = await oneOffChargesAPI.listForStudent(historyStudentId);
        setHistory(res.data.data || []);
      } catch {
        /* keep existing */
      }
    }
  };

  const visibleSelectableIds = students
    .filter((s) => !alreadyAssignedIds.has(s.id))
    .map((s) => s.id);
  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedStudentIds.includes(id));

  const selectAllVisible = () => {
    setSelectedStudentIds((prev) => [...new Set([...prev, ...visibleSelectableIds])]);
  };

  const unselectAllVisible = () => {
    const visible = new Set(visibleSelectableIds);
    setSelectedStudentIds((prev) => prev.filter((id) => !visible.has(id)));
  };

  const clearSelection = () => setSelectedStudentIds([]);

  const handleAssign = async () => {
    if (!selectedCharge || selectedStudentIds.length === 0) {
      toast.error('Select at least one student');
      return;
    }
    const toAssign = selectedStudentIds.filter((id) => !alreadyAssignedIds.has(id));
    if (toAssign.length === 0) {
      toast.error('All selected students are already assigned');
      return;
    }
    try {
      setActionLoading(true);
      await oneOffChargesAPI.assign(selectedCharge.id, { student_ids: toAssign });
      toast.success(
        toAssign.length === selectedStudentIds.length
          ? `Assigned to ${toAssign.length} student(s)`
          : `Assigned to ${toAssign.length}; skipped already assigned`,
      );
      setAssignConfirmOpen(false);
      setAssignOpen(false);
      setSelectedStudentIds([]);
      await refreshRelatedLists(selectedCharge.id);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to assign charge'));
    } finally {
      setActionLoading(false);
    }
  };

  const openAssignments = async (charge: OneOffCharge) => {
    setSelectedCharge(charge);
    setAssignmentsOpen(true);
    try {
      const res = await oneOffChargesAPI.listAssignments(charge.id);
      setAssignments(res.data.data || []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load assignments'));
      setAssignments([]);
    }
  };

  const handleWaive = async (assignmentId: string) => {
    try {
      setActionLoading(true);
      await oneOffChargesAPI.waive(assignmentId);
      toast.success('Charge waived');
      setWaiveConfirmId(null);
      await refreshRelatedLists(selectedCharge?.id);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to waive charge'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidAssignment) return;
    try {
      setActionLoading(true);
      await oneOffChargesAPI.markPaid(markPaidAssignment.id, {
        note: markPaidNote.trim() || undefined,
        external_ref: markPaidReference.trim() || undefined,
      });
      toast.success('Charge marked as paid');
      setMarkPaidAssignment(null);
      setMarkPaidNote('');
      setMarkPaidReference('');
      await refreshRelatedLists(selectedCharge?.id);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to mark charge as paid'));
    } finally {
      setActionLoading(false);
    }
  };

  const loadHistory = async (studentId: string) => {
    setHistoryStudentId(studentId);
    if (!studentId) {
      setHistory([]);
      return;
    }
    try {
      const res = await oneOffChargesAPI.listForStudent(studentId);
      setHistory(res.data.data || []);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to load charge history'));
    }
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Registration, uniforms, ID cards, photos, and other non-recurring charges.
            </p>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              New Charge
            </Button>
          </div>

          <DataTableShell
            title="Charge definitions"
            description="Create once, then assign to students."
            footer={
              !loading ? (
                <ListPagination
                  page={page}
                  totalPages={chargePagination.totalPages}
                  total={chargePagination.total}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : null
            }
          >
            {loading ? (
              <LoadingState label="Loading charges…" className="py-10" />
            ) : charges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163d]/5">
                  <Receipt className="h-6 w-6 text-[#08163d]/50" />
                </div>
                <p className="text-sm text-slate-400">No charges yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={Receipt}>Name</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Hash}>Amount</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Class</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Gender</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
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
                  {charges.map((charge) => (
                    <TableRow key={charge.id}>
                      <TableCell className="font-medium text-[#08163d]">{charge.name}</TableCell>
                      <TableCell className="text-sm font-medium text-[#08163d]">
                        {formatUgx(charge.amount)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{charge.class || 'All'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{charge.gender || 'All'}</TableCell>
                      <TableCell>
                        <StatusPill tone={toneFromStatus(charge.status)} dot>
                          {charge.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {charge.updated_at
                          ? new Date(charge.updated_at).toLocaleDateString()
                          : charge.created_at
                            ? new Date(charge.created_at).toLocaleDateString()
                            : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                            onClick={() => openAssign(charge)}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                            onClick={() => openEdit(charge)}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                            onClick={() => openAssignments(charge)}
                          >
                            <List className="mr-1 h-3 w-3" />
                            Assignments
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-full border-slate-200 px-2.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setDeleteConfirmId(charge.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>

          <DataTableShell
            title="Student payment history"
            description="Check whether an additional charge has already been paid for a student."
            toolbar={
              <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  className="h-9 rounded-full border-0 bg-[#F8F9FB] px-3 text-xs shadow-none ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-[#E8A317]/35"
                  value={historyClassFilter || 'all'}
                  onChange={(e) => handleHistoryClassChange(e.target.value)}
                >
                  <option value="all">Select a class</option>
                  {schoolClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
                {historyClassFilter ? (
                  <>
                    <PillSearch
                      value={historySearch}
                      onChange={setHistorySearch}
                      placeholder="Search students…"
                      className="min-w-[160px] flex-1"
                    />
                    <select
                      className="h-9 min-w-[180px] rounded-full border-0 bg-[#F8F9FB] px-3 text-xs shadow-none ring-1 ring-black/5 outline-none focus:ring-2 focus:ring-[#E8A317]/35"
                      value={historyStudentId}
                      onChange={(e) => loadHistory(e.target.value)}
                    >
                      <option value="">Select student</option>
                      {historyStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.registration_id} — {s.first_name} {s.last_name}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </div>
            }
          >
            {!historyClassFilter ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Choose a class first to narrow the student list.
              </p>
            ) : historyClassFilter && historyStudents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No students found in {historyClassFilter}
                {historySearch ? ' for this search' : ''}.
              </p>
            ) : history.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {historyStudentId ? 'No charge history for this student.' : 'Select a student to view history.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel>Charge</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Amount</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Paid at</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Reference</TableHeadLabel>
                    </TableHead>
                    <TableHead className="text-right">
                      <TableHeadLabel icon={MoreHorizontal} className="justify-end">
                        Actions
                      </TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-[#08163d]">{row.charge_name}</TableCell>
                      <TableCell className="text-sm">{formatUgx(row.amount)}</TableCell>
                      <TableCell>
                        <StatusPill
                          tone={
                            row.status === 'paid'
                              ? 'success'
                              : row.status === 'waived'
                                ? 'neutral'
                                : toneFromStatus(row.status)
                          }
                          dot
                        >
                          {row.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {row.paid_at ? new Date(row.paid_at).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {row.external_ref || '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {['unpaid', 'pending'].includes(row.status) ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                              onClick={() => {
                                setMarkPaidAssignment(row);
                                setMarkPaidNote('');
                                setMarkPaidReference('');
                              }}
                            >
                              Mark as paid
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 rounded-full border-slate-200 px-2.5 text-xs"
                              onClick={() => setWaiveConfirmId(row.id)}
                            >
                              Waive
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create additional charge</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Uniform"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Class (optional)</Label>
                <select
                  className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                  value={form.class || 'all'}
                  onChange={(e) =>
                    setForm({ ...form, class: e.target.value === 'all' ? '' : e.target.value })
                  }
                >
                  <option value="all">All classes</option>
                  {schoolClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  {form.class && !schoolClasses.includes(form.class) ? (
                    <option value={form.class}>{form.class}</option>
                  ) : null}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <select
                  className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={saving}
                onClick={handleCreate}
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
              >
                {saving ? (<><ButtonSpinner /> Creating…</>) : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit additional charge</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Class (optional)</Label>
                <select
                  className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                  value={form.class || 'all'}
                  onChange={(e) =>
                    setForm({ ...form, class: e.target.value === 'all' ? '' : e.target.value })
                  }
                >
                  <option value="all">All classes</option>
                  {schoolClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                  {form.class && !schoolClasses.includes(form.class) ? (
                    <option value={form.class}>{form.class}</option>
                  ) : null}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Gender (optional)</Label>
                <select
                  className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="">All genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={saving}
                onClick={handleUpdate}
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
              >
                {saving ? (<><ButtonSpinner /> Saving…</>) : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={assignOpen}
          onOpenChange={(open) => {
            setAssignOpen(open);
            if (!open) {
              setStudentSearch('');
              setAssignClassFilter('');
              setAssignGenderFilter('');
              setAssignPage(1);
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Assign {selectedCharge?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {selectedCharge?.class ? (
                <p className="text-sm text-muted-foreground">
                  Charge is scoped to class <span className="font-medium">{selectedCharge.class}</span>
                </p>
              ) : null}
              {selectedCharge?.gender ? (
                <p className="text-sm text-muted-foreground">
                  Charge targets <span className="font-medium">{selectedCharge.gender}</span> students
                </p>
              ) : null}
              <PillSearch
                value={studentSearch}
                onChange={setStudentSearch}
                placeholder="Search by name, registration ID, or phone…"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Filter by class</Label>
                  <select
                    className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                    value={assignClassFilter || 'all'}
                    disabled={!!selectedCharge?.class}
                    onChange={(e) =>
                      setAssignClassFilter(e.target.value === 'all' ? '' : e.target.value)
                    }
                  >
                    <option value="all">All classes</option>
                    {schoolClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                    {assignClassFilter && !schoolClasses.includes(assignClassFilter) ? (
                      <option value={assignClassFilter}>{assignClassFilter}</option>
                    ) : null}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Filter by gender</Label>
                  <select
                    className="flex h-10 w-full overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] border-input bg-background px-3 py-2 text-sm"
                    value={assignGenderFilter || 'all'}
                    disabled={!!selectedCharge?.gender}
                    onChange={(e) =>
                      setAssignGenderFilter(e.target.value === 'all' ? '' : e.target.value)
                    }
                  >
                    <option value="all">All genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={selectAllVisible}
                  disabled={assignLoading || visibleSelectableIds.length === 0 || allVisibleSelected}
                >
                  Select all on page
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={unselectAllVisible}
                  disabled={
                    assignLoading || !students.some((s) => selectedStudentIds.includes(s.id))
                  }
                >
                  Unselect page
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={clearSelection}
                  disabled={selectedStudentIds.length === 0}
                >
                  Clear all
                </Button>
                <span className="text-sm text-muted-foreground ml-auto">
                  {selectedStudentIds.length} selected
                </span>
              </div>
              <div className="max-h-72 space-y-2 overflow-auto rounded border p-2">
                {assignLoading ? (
                  <LoadingState label="Loading students…" className="py-6" size="sm" />
                ) : students.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">No students found</p>
                ) : (
                  students.map((s) => {
                    const alreadyAssigned = alreadyAssignedIds.has(s.id);
                    const checked = selectedStudentIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 text-sm ${
                          alreadyAssigned ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={alreadyAssigned}
                          onChange={(e) => {
                            setSelectedStudentIds((prev) =>
                              e.target.checked
                                ? [...prev, s.id]
                                : prev.filter((id) => id !== s.id),
                            );
                          }}
                        />
                        <span>
                          {s.registration_id} — {s.first_name} {s.last_name} ({s.class}
                          {s.gender ? `, ${s.gender}` : ''})
                          {alreadyAssigned ? (
                            <span className="ml-2 text-xs">(already assigned)</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
              <ListPagination
                page={assignPage}
                totalPages={assignPagination.totalPages}
                total={assignPagination.total}
                loading={assignLoading}
                onPageChange={setAssignPage}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    toast.error('Select at least one student');
                    return;
                  }
                  setAssignConfirmOpen(true);
                }}
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
              >
                Assign selected ({selectedStudentIds.length})
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={assignmentsOpen} onOpenChange={setAssignmentsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assignments — {selectedCharge?.name}</DialogTitle>
            </DialogHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground">
                      No assignments yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        {row.student_name || row.registration_id || row.id}
                      </TableCell>
                      <TableCell>
                        {formatUgx(row.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={toneFromStatus(row.status)} dot>
                          {row.status}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.external_ref || row.payment_note || '-'}
                      </TableCell>
                      <TableCell>
                        {['unpaid', 'pending'].includes(row.status) ? (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setMarkPaidAssignment(row);
                              setMarkPaidNote('');
                              setMarkPaidReference('');
                            }}>Mark as paid</Button>
                            <Button size="sm" variant="outline" onClick={() => setWaiveConfirmId(row.id)}>Waive</Button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={assignConfirmOpen}
          onOpenChange={setAssignConfirmOpen}
          description={`Are you sure you want to assign ${selectedCharge?.name || 'this charge'} to ${selectedStudentIds.length} student(s)?`}
          confirmLabel="Assign"
          loading={actionLoading}
          onConfirm={handleAssign}
        />

        <Dialog
          open={!!markPaidAssignment}
          onOpenChange={(open) => {
            if (!open) setMarkPaidAssignment(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark charge as paid</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Confirm the full offline payment for {markPaidAssignment?.charge_name}.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="mark-paid-reference">External reference (optional)</Label>
                <Input id="mark-paid-reference" value={markPaidReference} onChange={(e) => setMarkPaidReference(e.target.value)} placeholder="Receipt or transaction reference" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mark-paid-note">Note (optional)</Label>
                <Input id="mark-paid-note" value={markPaidNote} onChange={(e) => setMarkPaidNote(e.target.value)} placeholder="Payment note" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMarkPaidAssignment(null)}>Cancel</Button>
              <Button
                disabled={actionLoading}
                onClick={handleMarkPaid}
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
              >
                {actionLoading ? (<><ButtonSpinner /> Saving…</>) : 'Mark as paid'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!waiveConfirmId}
          onOpenChange={(open) => {
            if (!open) setWaiveConfirmId(null);
          }}
          description="Are you sure you want to waive this pending additional charge? The student will no longer owe this amount."
          confirmLabel="Waive"
          variant="destructive"
          loading={actionLoading}
          onConfirm={async () => {
            if (waiveConfirmId) await handleWaive(waiveConfirmId);
          }}
        />

        <ConfirmDialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
          description="Are you sure you want to delete this additional charge? This cannot be undone. Deletion is blocked if students are assigned or have paid."
          confirmLabel="Delete"
          variant="destructive"
          loading={actionLoading}
          onConfirm={async () => {
            if (deleteConfirmId) await handleDelete(deleteConfirmId);
          }}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
