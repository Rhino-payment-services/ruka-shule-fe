'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
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
import { Receipt, Plus, Edit, Trash2, Lock, Unlock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI, feesAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';

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
  const [fees, setFees] = useState<Fee[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [schoolChecked, setSchoolChecked] = useState(false);
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
    due_date: '',
  });

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (confirmOverrides = false) => {
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
      if (formData.due_date) payload.due_date = formData.due_date;

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
      due_date: fee.due_date ? fee.due_date.split('T')[0] : '',
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (confirmOverrides = false) => {
    if (!editingFee) return;

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
      if (formData.stream !== (editingFee.stream || '')) {
        payload.stream = formData.stream || null;
      }
      if (formData.due_date !== (editingFee.due_date?.split('T')[0] || '')) {
        payload.due_date = formData.due_date || null;
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
      due_date: '',
    });
  };

  const getFeeTypeBadge = (feeType: string) => {
    return feeType === 'school_fees' ? (
      <Badge className="bg-blue-500 hover:bg-blue-600">School Fees</Badge>
    ) : (
      <Badge className="bg-purple-500 hover:bg-purple-600">Other Fees</Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' ? (
      <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
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

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Fees Management</h1>
              <p className="mt-2 text-muted-foreground">Set and manage school fees structure</p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-[#08163d] hover:bg-[#0a1f4f] text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Fee
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                All Fees
              </CardTitle>
              <CardDescription>Manage your school's fee structure</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading fees...</p>
              ) : fees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Receipt className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No fees configured yet</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Fee
                  </Button>
                </div>
              ) : (
                <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Lock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.map((fee) => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.name}</TableCell>
                        <TableCell>{getFeeTypeBadge(fee.fee_type)}</TableCell>
                        <TableCell className="capitalize">{fee.billing_frequency || 'termly'}</TableCell>
                        <TableCell>
                          {fee.currency} {fee.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{fee.academic_year}</TableCell>
                        <TableCell>{fee.term || <span className="text-muted-foreground">All Terms</span>}</TableCell>
                        <TableCell>{fee.class || <span className="text-muted-foreground">All</span>}</TableCell>
                        <TableCell>{fee.stream || <span className="text-muted-foreground">All</span>}</TableCell>
                        <TableCell>
                          {fee.due_date ? new Date(fee.due_date).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        <TableCell>
                          {fee.is_locked ? (
                            <Badge className="bg-amber-500 hover:bg-amber-600">Locked</Badge>
                          ) : (
                            <Badge variant="outline">Open</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={fee.is_locked}
                              onClick={() => handleEdit(fee)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLockConfirmFee(fee)}
                              className={`h-8 w-8 p-0 ${fee.is_locked ? 'text-amber-600 hover:text-amber-700' : 'text-slate-600 hover:text-slate-900'}`}
                              title={fee.is_locked ? 'Unlock fee' : 'Lock fee'}
                            >
                              {fee.is_locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={fee.is_locked}
                              onClick={() => setDeleteConfirmId(fee.id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
                  totalPages={totalPages}
                  total={total}
                  loading={loading}
                  onPageChange={setPage}
                />
                </>
              )}
            </CardContent>
          </Card>

          {/* Create Fee Dialog */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Fee</DialogTitle>
                <DialogDescription>Add a new fee to your school's fee structure</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                  <Label htmlFor="amount">Amount (UGX) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
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
                    <p className="text-xs text-muted-foreground">
                      Leave empty for annual fees that apply to all terms
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="class">Class (Optional)</Label>
                    <Input
                      id="class"
                      placeholder="e.g., P1, KG1, Nursery"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty if fee applies to all classes
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
                    <p className="text-xs text-muted-foreground">
                      Different streams may have different fees (Arts vs Sciences)
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Due Date (Optional)</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleCreate()} className="bg-[#08163d] hover:bg-[#0a1f4f] text-white">
                  Create Fee
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Fee Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Fee</DialogTitle>
                <DialogDescription>Update fee details</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Fee Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-amount">Amount (UGX) *</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
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
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-due_date">Due Date (Optional)</Label>
                  <Input
                    id="edit-due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => handleUpdate()} className="bg-[#08163d] hover:bg-[#0a1f4f] text-white">
                  Update Fee
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <ConfirmDialog
            open={!!overrideConfirm}
            onOpenChange={(open) => {
              if (!open) setOverrideConfirm(null);
            }}
            description={`Are you sure you want to continue? ${overrideConfirm?.count ?? 0} student(s) in this class already have fee overrides, and those overrides will be kept.`}
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
