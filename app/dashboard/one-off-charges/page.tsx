'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { oneOffChargesAPI, studentsAPI, schoolsAPI } from '@/lib/api';
import { getApiErrorMessage, verifySchoolContextIssue } from '@/lib/api/errors';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Pencil, List } from 'lucide-react';
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
  const [assignPage, setAssignPage] = useState(1);
  const [assignPagination, setAssignPagination] = useState(normalizePaginationMeta({}));
  const [assignLoading, setAssignLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const debouncedHistorySearch = useDebouncedValue(historySearch);
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
    status: 'active',
  });

  const load = async () => {
    try {
      setLoading(true);
      await schoolsAPI.getMySchool();
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
          selectedCharge?.class || undefined,
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
  }, [assignOpen, assignPage, debouncedStudentSearch, selectedCharge?.class]);

  useEffect(() => {
    setAssignPage(1);
  }, [debouncedStudentSearch, selectedCharge?.class]);

  useEffect(() => {
    const loadHistoryStudents = async () => {
      try {
        const response = await studentsAPI.list(
          1,
          DEFAULT_PAGE_SIZE,
          undefined,
          debouncedHistorySearch || undefined,
        );
        setHistoryStudents(response.data.data || []);
      } catch (err: unknown) {
        toast.error(getApiErrorMessage(err, 'Failed to load students'));
      }
    };
    void loadHistoryStudents();
  }, [debouncedHistorySearch]);

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      amount: '',
      currency: 'UGX',
      class: '',
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

  const openAssign = async (charge: OneOffCharge) => {
    setSelectedCharge(charge);
    setSelectedStudentIds([]);
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Additional Charges
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  (One-off Charges)
                </span>
              </h1>
              <p className="text-muted-foreground">
                Registration, uniforms, ID cards, photos, and other non-recurring charges.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Charge
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Charge definitions</CardTitle>
              <CardDescription>Create once, then assign to students.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState label="Loading charges…" />
              ) : (
                <div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.map((charge) => (
                        <TableRow key={charge.id}>
                          <TableCell className="font-medium">{charge.name}</TableCell>
                          <TableCell>
                            {formatUgx(charge.amount)}
                          </TableCell>
                          <TableCell>{charge.class || 'All'}</TableCell>
                          <TableCell>
                            <Badge>{charge.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {charge.updated_at
                              ? new Date(charge.updated_at).toLocaleDateString()
                              : charge.created_at
                                ? new Date(charge.created_at).toLocaleDateString()
                                : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAssign(charge)}
                            >
                              Assign
                            </Button>
                              <Button size="sm" variant="outline" onClick={() => openEdit(charge)}>
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAssignments(charge)}>
                                <List className="mr-1 h-3 w-3" />
                                Assignments
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ListPagination
                    className="mt-4"
                    page={page}
                    totalPages={chargePagination.totalPages}
                    total={chargePagination.total}
                    loading={loading}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Student payment history</CardTitle>
              <CardDescription>
                Check whether an additional charge has already been paid for a student.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label>Student</Label>
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search students..."
                />
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={historyStudentId}
                  onChange={(e) => loadHistory(e.target.value)}
                >
                  <option value="">Select student</option>
                  {historyStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.registration_id} — {s.first_name} {s.last_name} ({s.class})
                    </option>
                  ))}
                </select>
              </div>
              {history.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Charge</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid at</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.charge_name}</TableCell>
                        <TableCell>
                          {formatUgx(row.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              row.status === 'paid'
                                ? 'bg-green-600'
                                : row.status === 'waived'
                                  ? 'bg-slate-500'
                                  : 'bg-amber-500'
                            }
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.paid_at ? new Date(row.paid_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          {row.external_ref || '-'}
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
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
                <Input
                  value={form.class}
                  onChange={(e) => setForm({ ...form, class: e.target.value })}
                  placeholder="KG1"
                />
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
              <Button disabled={saving} onClick={handleCreate}>
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
                <Input
                  value={form.class}
                  onChange={(e) => setForm({ ...form, class: e.target.value })}
                />
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
              <Button disabled={saving} onClick={handleUpdate}>
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
                  Showing students in class <span className="font-medium">{selectedCharge.class}</span>
                </p>
              ) : null}
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, registration ID, or phone..."
              />
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
                          {s.registration_id} — {s.first_name} {s.last_name} ({s.class})
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
                        <Badge>{row.status}</Badge>
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
              <Button disabled={actionLoading} onClick={handleMarkPaid}>
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
      </DashboardLayout>
    </ProtectedRoute>
  );
}
