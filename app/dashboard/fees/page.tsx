'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DataTableShell,
  StatusPill,
  TableHeadLabel,
  toneFromStatus,
} from '@/components/data-table';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Receipt,
  Plus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Calendar,
  CircleDot,
  MoreHorizontal,
  Hash,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, feesAPI } from '@/lib/api';
import { getApiErrorMessage, verifySchoolContextIssue } from '@/lib/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ButtonSpinner, LoadingState } from '@/components/LoadingState';
import { DatePicker } from '@/components/DatePicker';
import { dueDateToApi, isFutureDueDate } from '@/lib/dates';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

interface Fee {
  id: string;
  name: string;
  amount: number;
  currency: string;
  fee_type: 'school_fees' | 'other_fees';
  billing_frequency?: string;
  academic_year: string;
  term?: string | null;
  class?: string | null;
  stream?: string | null;
  gender?: string | null;
  due_date?: string | null;
  status: 'active' | 'inactive';
  is_locked: boolean;
  school_id: string;
  created_at: string;
  updated_at?: string;
}

const STREAMS = ['General', 'Arts', 'Sciences', 'Business', 'Technical'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const BILLING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'termly', 'annual', 'one_off'] as const;
export default function FeesPage() {
  const { user } = useAuth();
  const canWriteFees = hasPermission(user, PERMISSIONS.feesWrite);
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
  const [schoolClasses, setSchoolClasses] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [overrideConfirm, setOverrideConfirm] = useState<{
    mode: 'create' | 'update';
    count: number;
  } | null>(null);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [lockConfirmFee, setLockConfirmFee] = useState<Fee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'UGX',
    fee_type: 'school_fees' as 'school_fees' | 'other_fees',
    billing_frequency: 'termly',
    academic_year: new Date().getFullYear().toString(),
    term: '',
    class: '',
    stream: '',
    gender: '',
    due_date: '',
  });

  useEffect(() => {
    const checkSchool = async () => {
      try {
        const res = await schoolsAPI.getMySchool();
        const classes = res.data.data?.classes;
        if (Array.isArray(classes)) {
          setSchoolClasses([...classes].sort());
        } else {
          setSchoolClasses([]);
        }
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
    loadFees();
  }, [page, schoolChecked, schoolSetupRequired]);

  const loadFees = async () => {
    if (schoolSetupRequired) return;
    setLoading(true);
    try {
      const res = await feesAPI.list(page, DEFAULT_PAGE_SIZE);
      setFees(res.data.data || []);
      const meta = normalizePaginationMeta(res.data, page);
      setTotal(meta.total);
      setTotalPages(meta.totalPages);
    } catch (error: unknown) {
      const schoolContext = await verifySchoolContextIssue(error, () => schoolsAPI.getMySchool());
      if (schoolContext === 'missing_school_link') {
        setSchoolSetupRequired(true);
        setFees([]);
      } else if (schoolContext === 'unexpected_context') {
        toast.error(
          'Your school link exists, but school context could not be verified. Please refresh and try again.',
        );
      } else {
        toast.error(getApiErrorMessage(error, 'Failed to load fees'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (confirmOverrides = false) => {
    if (formData.due_date && !isFutureDueDate(formData.due_date)) {
      toast.error('Due date must be after today');
      return;
    }
    try {
      setConfirmLoading(true);
      const payload: Record<string, unknown> = {
        name: formData.name,
        amount: parseFloat(formData.amount),
        currency: 'UGX',
        fee_type: formData.fee_type,
        billing_frequency: formData.billing_frequency,
        academic_year: formData.academic_year,
        confirm_overrides: confirmOverrides,
      };

      if (formData.term) payload.term = formData.term;
      if (formData.class) payload.class = formData.class;
      if (formData.stream) payload.stream = formData.stream;
      if (formData.gender) payload.gender = formData.gender;
      if (formData.due_date) payload.due_date = dueDateToApi(formData.due_date);

      await feesAPI.create(payload);
      toast.success('Fee created successfully');
      setIsCreateDialogOpen(false);
      setOverrideConfirm(null);
      resetForm();
      loadFees();
    } catch (error: any) {
      if (
        error?.response?.status === 409 &&
        error?.response?.data?.code === 'duplicate_fee_structure'
      ) {
        setDuplicateDialogOpen(true);
        return;
      }
      if (
        error?.response?.status === 409 &&
        error?.response?.data?.require_confirm_overrides &&
        !confirmOverrides
      ) {
        setOverrideConfirm({
          mode: 'create',
          count: error.response.data.students_with_overrides ?? 0,
        });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Failed to create fee'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEdit = (fee: Fee) => {
    if (fee.is_locked) {
      toast.error('Unlock the fee before editing it');
      return;
    }
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      amount: fee.amount.toString(),
      currency: fee.currency,
      fee_type: fee.fee_type,
      billing_frequency: fee.billing_frequency || 'termly',
      academic_year: fee.academic_year,
      term: fee.term || '',
      class: fee.class || '',
      stream: fee.stream || '',
      gender: fee.gender || '',
      due_date: fee.due_date ? fee.due_date.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (confirmOverrides = false) => {
    if (!editingFee) return;
    const previousDue = editingFee.due_date?.split('T')[0] || '';
    if (formData.due_date && formData.due_date !== previousDue && !isFutureDueDate(formData.due_date)) {
      toast.error('Due date must be after today');
      return;
    }

    try {
      setConfirmLoading(true);
      const payload: Record<string, unknown> = {};

      if (formData.name !== editingFee.name) payload.name = formData.name;
      if (parseFloat(formData.amount) !== editingFee.amount) payload.amount = parseFloat(formData.amount);
      if (formData.fee_type !== editingFee.fee_type) payload.fee_type = formData.fee_type;
      if (formData.billing_frequency !== (editingFee.billing_frequency || 'termly')) {
        payload.billing_frequency = formData.billing_frequency;
      }
      if (formData.term !== (editingFee.term || '')) {
        payload.term = formData.term || null;
      }
      if (formData.class !== (editingFee.class || '')) {
        payload.class = formData.class || null;
      }
      if (formData.stream !== (editingFee.stream || '')) {
        payload.stream = formData.stream || null;
      }
      if (formData.gender !== (editingFee.gender || '')) {
        payload.gender = formData.gender || null;
      }
      if (formData.due_date !== (editingFee.due_date?.split('T')[0] || '')) {
        payload.due_date = formData.due_date ? dueDateToApi(formData.due_date) : null;
      }
      if (confirmOverrides) payload.confirm_overrides = true;

      await feesAPI.update(editingFee.id, payload);
      toast.success('Fee updated successfully');
      setIsEditDialogOpen(false);
      setEditingFee(null);
      setOverrideConfirm(null);
      resetForm();
      loadFees();
    } catch (error: any) {
      if (
        error?.response?.status === 409 &&
        error?.response?.data?.code === 'duplicate_fee_structure'
      ) {
        setDuplicateDialogOpen(true);
        return;
      }
      if (
        error?.response?.status === 409 &&
        error?.response?.data?.require_confirm_overrides &&
        !confirmOverrides
      ) {
        setOverrideConfirm({
          mode: 'update',
          count: error.response.data.students_with_overrides ?? 0,
        });
        return;
      }
      toast.error(getApiErrorMessage(error, 'Failed to update fee'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleToggleLock = async (fee: Fee) => {
    try {
      setConfirmLoading(true);
      await feesAPI.update(fee.id, { is_locked: !fee.is_locked });
      toast.success(fee.is_locked ? 'Fee unlocked successfully' : 'Fee locked successfully');
      setLockConfirmFee(null);
      loadFees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update fee lock');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const fee = fees.find((item) => item.id === id);
    if (fee?.is_locked) {
      toast.error('Unlock the fee before deleting it');
      return;
    }

    try {
      setConfirmLoading(true);
      await feesAPI.delete(id);
      toast.success('Fee deleted successfully');
      setDeleteConfirmId(null);
      loadFees();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete fee');
    } finally {
      setConfirmLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      currency: 'UGX',
      fee_type: 'school_fees',
      billing_frequency: 'termly',
      academic_year: new Date().getFullYear().toString(),
      term: '',
      class: '',
      stream: '',
      gender: '',
      due_date: '',
    });
  };

  const getFeeTypeBadge = (feeType: string) => {
    return feeType === 'school_fees' ? (
      <StatusPill tone="info" dot>School Fees</StatusPill>
    ) : (
      <StatusPill tone="neutral" dot>Other Fees</StatusPill>
    );
  };

  const getStatusBadge = (status: string) => {
    return <StatusPill tone={toneFromStatus(status)} dot>{status === 'active' ? 'Active' : 'Inactive'}</StatusPill>;
  };

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.feesRead}>
      <DashboardLayout>
        <div className="space-y-4">
          {schoolSetupRequired && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">School setup required</CardTitle>
                <CardDescription className="text-amber-800">
                  This account is active, but no school is linked yet. Complete school onboarding before managing fees.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => window.location.assign('/dashboard/schools/onboard')} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Onboard School
                </Button>
                <Button variant="outline" onClick={() => window.location.assign('/dashboard/settings')}>
                  Open Settings
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Set and manage school fees structure</p>
            {canWriteFees && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Fee
              </Button>
            )}
          </div>

          <DataTableShell
            title="All Fees"
            description="Manage your school's fee structure"
            footer={
              fees.length > 0 ? (
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : null
            }
          >
            {loading ? (
              <LoadingState label="Loading fees…" className="py-10" />
            ) : fees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163d]/5">
                  <Receipt className="h-6 w-6 text-[#08163d]/50" />
                </div>
                <p className="mb-4 text-sm text-slate-400">No fees configured yet</p>
                {canWriteFees && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="outline"
                    className="h-9 rounded-full border-slate-200"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Create First Fee
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={Receipt}>Name</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Type</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Frequency</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Hash}>Amount</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Year</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Term</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Class</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Stream</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel>Gender</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Due Date</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={CircleDot}>Status</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Lock}>Lock</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Updated</TableHeadLabel>
                    </TableHead>
                    {canWriteFees && (
                      <TableHead className="text-right">
                        <TableHeadLabel icon={MoreHorizontal} className="justify-end">
                          Actions
                        </TableHeadLabel>
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium text-[#08163d]">{fee.name}</TableCell>
                      <TableCell>{getFeeTypeBadge(fee.fee_type)}</TableCell>
                      <TableCell className="capitalize text-xs text-slate-600">
                        {fee.billing_frequency || 'termly'}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-[#08163d]">
                        {fee.currency} {fee.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{fee.academic_year}</TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {fee.term || 'All Terms'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{fee.class || 'All'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fee.stream || 'All'}</TableCell>
                      <TableCell className="text-xs text-slate-500">{fee.gender || 'All'}</TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(fee.status)}</TableCell>
                      <TableCell>
                        {fee.is_locked ? (
                          <StatusPill tone="warning" dot>
                            Locked
                          </StatusPill>
                        ) : (
                          <StatusPill tone="neutral" dot>
                            Open
                          </StatusPill>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {fee.updated_at
                          ? new Date(fee.updated_at).toLocaleDateString()
                          : new Date(fee.created_at).toLocaleDateString()}
                      </TableCell>
                      {canWriteFees && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={fee.is_locked}
                            onClick={() => handleEdit(fee)}
                            className="h-7 px-2 text-[#08163d] hover:bg-[#FFF4C2]/50"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLockConfirmFee(fee)}
                            className={`h-7 px-2 hover:bg-[#FFF4C2]/50 ${
                              fee.is_locked
                                ? 'text-amber-600 hover:text-amber-700'
                                : 'text-slate-600 hover:text-[#08163d]'
                            }`}
                            title={fee.is_locked ? 'Unlock fee' : 'Lock fee'}
                          >
                            {fee.is_locked ? (
                              <Unlock className="h-3.5 w-3.5" />
                            ) : (
                              <Lock className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={fee.is_locked}
                            onClick={() => setDeleteConfirmId(fee.id)}
                            className="h-7 px-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>

          {/* Create Fee Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Fee</DialogTitle>
                <DialogDescription>Add a new fee to your school's fee structure</DialogDescription>
              </DialogHeader>
              <DialogBody>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Fee Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Tuition Fee, Library Fee"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="amount">
                    {formData.billing_frequency === 'monthly' ? 'Amount per month (UGX) *' : 'Amount (UGX) *'}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                  {formData.billing_frequency === 'monthly' && (
                    <p className="text-xs text-slate-500">
                      Charged as one month (the amount entered above).
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fee_type">Fee Type *</Label>
                  <Select
                    value={formData.fee_type}
                    onValueChange={(value: 'school_fees' | 'other_fees') =>
                      setFormData({ ...formData, fee_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school_fees">School Fees</SelectItem>
                      <SelectItem value="other_fees">Other Fees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="billing_frequency">Billing Frequency *</Label>
                  <Select
                    value={formData.billing_frequency}
                    onValueChange={(value) => setFormData({ ...formData, billing_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq} className="capitalize">
                          {freq.replace('_', '-')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="academic_year">Academic Year *</Label>
                    <Input
                      id="academic_year"
                      placeholder="2024"
                      value={formData.academic_year}
                      onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="term">Term (Optional)</Label>
                    <Select
                      value={formData.term || 'all_terms'}
                      onValueChange={(value) => setFormData({ ...formData, term: value === 'all_terms' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Terms (Annual Fee)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_terms">All Terms (Annual Fee)</SelectItem>
                        {TERMS.map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Leave empty for annual fees that apply to all terms
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="class">Class (Optional)</Label>
                    <Select
                      value={formData.class || 'all_classes'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, class: value === 'all_classes' ? '' : value })
                      }
                    >
                      <SelectTrigger id="class">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_classes">All classes</SelectItem>
                        {schoolClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                        {formData.class && !schoolClasses.includes(formData.class) ? (
                          <SelectItem value={formData.class}>{formData.class}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Leave as All if fee applies to every class
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stream">Stream (Optional)</Label>
                    <Select
                      value={formData.stream || 'all_streams'}
                      onValueChange={(value) => setFormData({ ...formData, stream: value === 'all_streams' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Streams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_streams">All Streams</SelectItem>
                        {STREAMS.map((stream) => (
                          <SelectItem key={stream} value={stream}>
                            {stream}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      Different streams may have different fees (Arts vs Sciences)
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="gender">Gender (Optional)</Label>
                  <Select
                    value={formData.gender || 'all_genders'}
                    onValueChange={(value) => setFormData({ ...formData, gender: value === 'all_genders' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_genders">All genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    Limit this fee to boys, girls, or both
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date (Optional)</Label>
                  <DatePicker
                    id="due_date"
                    value={formData.due_date}
                    onChange={(due_date) => setFormData({ ...formData, due_date })}
                    placeholder="Select a future due date"
                  />
                  <p className="text-xs text-slate-500">Today and past dates cannot be selected.</p>
                </div>
              </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={confirmLoading}
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="h-9 rounded-full border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleCreate()}
                  disabled={confirmLoading}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {confirmLoading ? (
                    <>
                      <ButtonSpinner />
                      Creating…
                    </>
                  ) : (
                    'Create Fee'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Fee</DialogTitle>
                <DialogDescription>Update fee details</DialogDescription>
              </DialogHeader>
              <DialogBody>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Fee Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">
                    {formData.billing_frequency === 'monthly' ? 'Amount per month (UGX) *' : 'Amount (UGX) *'}
                  </Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                  {formData.billing_frequency === 'monthly' && (
                    <p className="text-xs text-slate-500">
                      Charged as one month (the amount entered above).
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-fee_type">Fee Type *</Label>
                  <Select
                    value={formData.fee_type}
                    onValueChange={(value: 'school_fees' | 'other_fees') =>
                      setFormData({ ...formData, fee_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="school_fees">School Fees</SelectItem>
                      <SelectItem value="other_fees">Other Fees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-billing_frequency">Billing Frequency *</Label>
                  <Select
                    value={formData.billing_frequency}
                    onValueChange={(value) => setFormData({ ...formData, billing_frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_FREQUENCIES.map((freq) => (
                        <SelectItem key={freq} value={freq} className="capitalize">
                          {freq.replace('_', '-')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-term">Term (Optional)</Label>
                    <Select
                      value={formData.term || 'all_terms'}
                      onValueChange={(value) => setFormData({ ...formData, term: value === 'all_terms' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Terms (Annual Fee)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_terms">All Terms (Annual Fee)</SelectItem>
                        {TERMS.map((term) => (
                          <SelectItem key={term} value={term}>
                            {term}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-class">Class (Optional)</Label>
                    <Select
                      value={formData.class || 'all_classes'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, class: value === 'all_classes' ? '' : value })
                      }
                    >
                      <SelectTrigger id="edit-class">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_classes">All classes</SelectItem>
                        {schoolClasses.map((cls) => (
                          <SelectItem key={cls} value={cls}>
                            {cls}
                          </SelectItem>
                        ))}
                        {formData.class && !schoolClasses.includes(formData.class) ? (
                          <SelectItem value={formData.class}>{formData.class}</SelectItem>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-stream">Stream (Optional)</Label>
                  <Select
                    value={formData.stream || 'all_streams'}
                    onValueChange={(value) => setFormData({ ...formData, stream: value === 'all_streams' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Streams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_streams">All Streams</SelectItem>
                      {STREAMS.map((stream) => (
                        <SelectItem key={stream} value={stream}>
                          {stream}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-gender">Gender (Optional)</Label>
                  <Select
                    value={formData.gender || 'all_genders'}
                    onValueChange={(value) => setFormData({ ...formData, gender: value === 'all_genders' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All genders" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_genders">All genders</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-due_date">Due Date (Optional)</Label>
                  <DatePicker
                    id="edit-due_date"
                    value={formData.due_date}
                    onChange={(due_date) => setFormData({ ...formData, due_date })}
                    placeholder="Select a future due date"
                  />
                  <p className="text-xs text-slate-500">Today and past dates cannot be selected.</p>
                </div>
              </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={confirmLoading}
                  onClick={() => setIsEditDialogOpen(false)}
                  className="h-9 rounded-full border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleUpdate()}
                  disabled={confirmLoading}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {confirmLoading ? (
                    <>
                      <ButtonSpinner />
                      Saving…
                    </>
                  ) : (
                    'Update Fee'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!overrideConfirm}
            onOpenChange={(open) => {
              if (!open) setOverrideConfirm(null);
            }}
            description={`Are you sure you want to continue? ${overrideConfirm?.count ?? 0} student(s) in this class already have custom school fees, and those amounts will be kept.`}
            confirmLabel={overrideConfirm?.mode === 'update' ? 'Update fee' : 'Create fee'}
            loading={confirmLoading}
            onConfirm={async () => {
              if (overrideConfirm?.mode === 'update') {
                await handleUpdate(true);
              } else {
                await handleCreate(true);
              }
            }}
          />

          <ConfirmDialog
            open={duplicateDialogOpen}
            onOpenChange={setDuplicateDialogOpen}
            title="Duplicate fee structure"
            description="An active school fees structure already exists for this class, year, term, and stream. Edit or deactivate the existing fee instead of creating another."
            confirmLabel="OK"
            cancelLabel="Close"
            onConfirm={() => setDuplicateDialogOpen(false)}
          />

          <ConfirmDialog
            open={!!deleteConfirmId}
            onOpenChange={(open) => {
              if (!open) setDeleteConfirmId(null);
            }}
            description="Are you sure you want to delete this fee? This cannot be undone."
            confirmLabel="Delete"
            variant="destructive"
            loading={confirmLoading}
            onConfirm={async () => {
              if (deleteConfirmId) await handleDelete(deleteConfirmId);
            }}
          />

          <ConfirmDialog
            open={!!lockConfirmFee}
            onOpenChange={(open) => {
              if (!open) setLockConfirmFee(null);
            }}
            description={
              lockConfirmFee?.is_locked
                ? 'Are you sure you want to unlock this fee so it can be edited or deleted?'
                : 'Are you sure you want to lock this fee to prevent edits and deletion?'
            }
            confirmLabel={lockConfirmFee?.is_locked ? 'Unlock' : 'Lock'}
            loading={confirmLoading}
            onConfirm={async () => {
              if (lockConfirmFee) await handleToggleLock(lockConfirmFee);
            }}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
