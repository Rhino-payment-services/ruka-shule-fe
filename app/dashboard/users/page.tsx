'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { Users, Shield, UserCircle, Mail, School, Calendar, BadgeCheck } from 'lucide-react';
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
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';
import {
  DataTableShell,
  StatusPill,
  TableHeadLabel,
} from '@/components/data-table';

interface UserData {
  id: string;
  email: string;
  phone: string;
  role: string;
  school_id?: string;
  school_name?: string;
  created_at: string;
  updated_at?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [page]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listUsers(page, DEFAULT_PAGE_SIZE);
      setUsers(res.data.data || []);
      setTotal(res.data.total ?? 0);
      setTotalPages(normalizePaginationMeta(res.data).totalPages);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">Platform admins and school admins</p>

          <DataTableShell
            title="All Users"
            description={`${total} users registered on the platform`}
            footer={
              users.length > 0 ? (
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
              <LoadingState label="Loading users…" className="py-10" />
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-400">No users yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>
                      <TableHeadLabel icon={Mail}>User</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={BadgeCheck}>Role</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={School}>School</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Created</TableHeadLabel>
                    </TableHead>
                    <TableHead>
                      <TableHeadLabel icon={Calendar}>Updated</TableHeadLabel>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#08163d]/5">
                            {u.role === 'admin' ? (
                              <Shield className="h-3.5 w-3.5 text-[#08163d]" />
                            ) : (
                              <UserCircle className="h-3.5 w-3.5 text-[#08163d]" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[#08163d]">{u.email}</div>
                            <div className="text-[11px] text-slate-400">{u.phone}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusPill tone={u.role === 'admin' ? 'info' : 'success'} dot>
                          {u.role === 'admin' ? 'Platform Admin' : 'School Admin'}
                        </StatusPill>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">{u.school_name || '—'}</TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400">
                        {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : '—'}
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
