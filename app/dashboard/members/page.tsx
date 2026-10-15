'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataTableShell, StatusPill, TableHeadLabel, toneFromStatus } from '@/components/data-table';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ButtonSpinner, LoadingState } from '@/components/LoadingState';
import { ListPagination } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import { membersAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { PermissionCatalogItem, RolePermissions, SchoolMember } from '@/lib/api/types';
import { hasPermission, PERMISSIONS, roleLabel, SCHOOL_ROLES } from '@/lib/permissions';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, Plus, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const ASSIGNABLE_ROLES = SCHOOL_ROLES;

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'teacher' as string,
  permissions: [] as string[],
};

export default function MembersPage() {
  const { user } = useAuth();
  const canWrite = hasPermission(user, PERMISSIONS.membersWrite);
  const canManageRoles = hasPermission(user, PERMISSIONS.rolesManage);

  const [members, setMembers] = useState<SchoolMember[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [templates, setTemplates] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolMember | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'deactivate' | 'activate' | 'remove'; member: SchoolMember } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [listRes, catRes, tplRes] = await Promise.all([
        membersAPI.list(page, DEFAULT_PAGE_SIZE),
        membersAPI.catalog(),
        canManageRoles ? membersAPI.rolePermissions() : Promise.resolve({ data: { data: [] as RolePermissions[] } }),
      ]);
      setMembers(listRes.data.data || []);
      setTotal(listRes.data.total ?? 0);
      setTotalPages(normalizePaginationMeta(listRes.data).totalPages);
      setCatalog(catRes.data.data || []);
      const tpls = tplRes.data.data || [];
      setTemplates(tpls);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to load members'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, PermissionCatalogItem[]>();
    for (const item of catalog) {
      const list = groups.get(item.resource) || [];
      list.push(item);
      groups.set(item.resource, list);
    }
    return Array.from(groups.entries());
  }, [catalog]);

  const openCreate = () => {
    setEditing(null);
    const defaults = templates.find((t) => t.role === 'teacher')?.permissions || [];
    setForm({ ...emptyForm, permissions: defaults });
    setDialogOpen(true);
  };

  const openEdit = (member: SchoolMember) => {
    if (member.id === user?.id) return;
    setEditing(member);
    setForm({
      first_name: member.first_name || '',
      last_name: member.last_name || '',
      email: member.email,
      phone: member.phone,
      role: member.role,
      permissions: member.permissions || [],
    });
    setDialogOpen(true);
  };

  const onRoleChange = (role: string) => {
    const defaults = templates.find((t) => t.role === role)?.permissions || [];
    setForm((s) => ({ ...s, role, permissions: defaults }));
  };

  const togglePerm = (code: string) => {
    setForm((s) => ({
      ...s,
      permissions: s.permissions.includes(code)
        ? s.permissions.filter((c) => c !== code)
        : [...s.permissions, code],
    }));
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error('Full name, email, and phone are required');
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        await membersAPI.update(editing.id, form);
        toast.success('Member updated');
        setDialogOpen(false);
        await load();
      } else {
        const res = await membersAPI.create(form);
        const invited = res.data.data;
        setDialogOpen(false);
        await load();
        if (invited.email_sent) {
          toast.success(`Invite sent to ${form.email}`);
        } else if (invited.invite_url) {
          setInviteUrl(invited.invite_url);
        } else {
          toast.success('Member invited');
        }
      }
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to save member'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!pendingAction) return;
    try {
      setActionLoading(true);
      if (pendingAction.type === 'remove') {
        await membersAPI.remove(pendingAction.member.id);
        toast.success('Member removed');
      } else if (pendingAction.type === 'deactivate') {
        await membersAPI.deactivate(pendingAction.member.id);
        toast.success('Member deactivated');
      } else {
        await membersAPI.activate(pendingAction.member.id);
        toast.success('Member activated');
      }
      setPendingAction(null);
      await load();
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.membersRead}>
      <DashboardLayout>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Add and manage people who can access this school account</p>
            {canWrite && (
              <Button onClick={openCreate} className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Member
              </Button>
            )}
          </div>

          <DataTableShell
            title="School members"
            description={`${total} people linked to this school`}
            footer={
              members.length > 0 ? (
                <ListPagination
                  page={page}
                  totalPages={totalPages}
                  total={total}
                  loading={loading}
                  onPageChange={setPage}
                />
              ) : undefined
            }
          >
            {loading ? (
              <LoadingState label="Loading members…" className="py-10" />
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08163d]/5">
                  <UserPlus className="h-6 w-6 text-[#08163d]/50" />
                </div>
                <p className="text-sm text-slate-400">No members yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead><TableHeadLabel>Name</TableHeadLabel></TableHead>
                    <TableHead><TableHeadLabel>Email</TableHeadLabel></TableHead>
                    <TableHead><TableHeadLabel>Role</TableHeadLabel></TableHead>
                    <TableHead><TableHeadLabel>Status</TableHeadLabel></TableHead>
                    {canWrite && <TableHead><TableHeadLabel>Actions</TableHeadLabel></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="text-sm text-[#08163d]">
                        <div className="flex items-center gap-2">
                          <span>{[member.first_name, member.last_name].filter(Boolean).join(' ') || '—'}</span>
                          {member.id === user?.id ? <StatusPill tone="neutral">You</StatusPill> : null}
                        </div>
                        <div className="text-xs text-slate-400">{member.phone}</div>
                      </TableCell>
                      <TableCell className="text-sm">{member.email}</TableCell>
                      <TableCell><StatusPill tone="info">{roleLabel(member.role)}</StatusPill></TableCell>
                      <TableCell>
                        <StatusPill tone={toneFromStatus(member.status)} dot>
                          {member.status}
                        </StatusPill>
                      </TableCell>
                      {canWrite && (
                        <TableCell className="space-x-2 text-xs">
                          {member.id === user?.id ? (
                            <span className="text-slate-400">Your account</span>
                          ) : (
                            <>
                          <button className="text-[#08163d] hover:underline" onClick={() => openEdit(member)}>Edit</button>
                          {member.status === 'pending' && (
                            <button
                              className="text-[#08163d] hover:underline"
                              onClick={async () => {
                                try {
                                  const res = await membersAPI.resendInvitation(member.id);
                                  const invited = res.data.data;
                                  if (invited.email_sent) {
                                    toast.success(`Invitation resent to ${member.email}`);
                                  } else if (invited.invite_url) {
                                    setInviteUrl(invited.invite_url);
                                  } else {
                                    toast.success('Invitation resent');
                                  }
                                } catch (error: unknown) {
                                  toast.error(getApiErrorMessage(error, 'Failed to resend invitation'));
                                }
                              }}
                            >
                              Resend
                            </button>
                          )}
                          {member.status === 'active' && (
                            <button className="text-amber-700 hover:underline" onClick={() => setPendingAction({ type: 'deactivate', member })}>
                              Deactivate
                            </button>
                          )}
                          {member.status === 'inactive' && (
                            <button className="text-emerald-700 hover:underline" onClick={() => setPendingAction({ type: 'activate', member })}>
                              Activate
                            </button>
                          )}
                          <button className="text-red-600 hover:underline" onClick={() => setPendingAction({ type: 'remove', member })}>
                            Remove
                          </button>
                            </>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </DataTableShell>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit member' : 'Add member'}</DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Update this person’s details, role, and what they can access'
                  : 'Choose a role, then adjust permissions for this person if needed'}
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">First name</Label>
                  <Input value={form.first_name} onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Last name</Label>
                  <Input value={form.last_name} onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-500">Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Role</Label>
                <Select value={form.role} onValueChange={onRoleChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <PermissionChecks
                grouped={groupedCatalog}
                selected={form.permissions}
                onToggle={togglePerm}
              />
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" className="h-9 rounded-full border-slate-200" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]">
                {saving ? <><ButtonSpinner /> Saving…</> : editing ? 'Save' : 'Send invite'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!inviteUrl} onOpenChange={() => setInviteUrl('')}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share setup link</DialogTitle>
              <DialogDescription>
                The invite email could not be sent. Copy this link and share it with the member so they can set a password.
              </DialogDescription>
            </DialogHeader>
            <DialogBody>
              <div className="break-all rounded-xl bg-[#F8F9FB] px-3 py-2.5 text-xs leading-5 text-[#08163d] ring-1 ring-black/5">{inviteUrl}</div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" className="h-9 rounded-full border-slate-200" onClick={() => setInviteUrl('')}>
                Close
              </Button>
              <Button
                className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteUrl);
                  toast.success('Link copied');
                }}
              >
                <Copy className="mr-1.5 h-4 w-4" /> Copy link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!pendingAction}
          onOpenChange={() => setPendingAction(null)}
          title={pendingAction?.type === 'remove' ? 'Remove member?' : pendingAction?.type === 'deactivate' ? 'Deactivate member?' : 'Activate member?'}
          description={
            pendingAction?.type === 'remove'
              ? 'This member will lose access to the school account.'
              : pendingAction?.type === 'deactivate'
                ? 'They will not be able to sign in until you activate them again.'
                : 'This member will be able to sign in again.'
          }
          confirmLabel={pendingAction?.type === 'remove' ? 'Remove' : pendingAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
          variant={pendingAction?.type === 'remove' ? 'destructive' : 'default'}
          loading={actionLoading}
          onConfirm={runAction}
        />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function PermissionChecks({
  grouped,
  selected,
  onToggle,
}: {
  grouped: [string, PermissionCatalogItem[]][];
  selected: string[];
  onToggle: (code: string) => void;
}) {
  return (
    <div className="space-y-3">
      {grouped.map(([resource, items]) => (
        <div key={resource}>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">{resource}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {items.map((item) => (
              <label key={item.code} className="flex items-start gap-2 rounded-xl px-2 py-1.5 text-sm text-[#08163d]">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={selected.includes(item.code)}
                  onChange={() => onToggle(item.code)}
                />
                <span>{item.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
