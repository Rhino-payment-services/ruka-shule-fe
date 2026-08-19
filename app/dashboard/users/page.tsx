'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { Users, Shield, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListPagination } from '@/components/ListPagination';
import { LoadingState } from '@/components/LoadingState';
import { DEFAULT_PAGE_SIZE, normalizePaginationMeta } from '@/lib/hooks/useServerPagination';

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
  const router = useRouter();
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
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">
                Users
              </h1>
              <p className="mt-2 text-muted-foreground">
                Platform admins and school admins
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>
                {total} users registered on the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState label="Loading users…" />
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="font-medium text-muted-foreground">No users yet</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20">
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Role</TableHead>
                        <TableHead className="font-semibold">School</TableHead>
                        <TableHead className="font-semibold">Created</TableHead>
                        <TableHead className="font-semibold">Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-primary/5">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                {u.role === 'admin' ? (
                                  <Shield className="h-4 w-4 text-primary" />
                                ) : (
                                  <UserCircle className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">{u.email}</div>
                                <div className="text-xs text-muted-foreground">{u.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                u.role === 'admin'
                                  ? 'bg-blue-100 text-blue-700 border-blue-300'
                                  : 'bg-green-100 text-green-700 border-green-300'
                              }
                            >
                              {u.role === 'admin' ? 'Platform Admin' : 'School Admin'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {u.school_name || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {u.updated_at
                              ? new Date(u.updated_at).toLocaleDateString()
                              : '—'}
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
