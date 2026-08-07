'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI, adminAPI } from '@/lib/api';
import { School, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
}

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveSchoolId, setApproveSchoolId] = useState<string | null>(null);
  const [approveReason, setApproveReason] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.list(1, 100);
      const data = response.data.data || [];
      data.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta; // newest first
      });
      setSchools(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    } catch (err) {
      toast.error('Failed to approve school. See console for details.');
    } finally {
      setApproving(false);
    }
  };

  const getMerchantStatusBadge = (status?: string) => {
    if (!status) return <span className="text-muted-foreground">—</span>;
    if (status === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300" variant="outline">
          Approved
        </Badge>
      );
    }
    if (status === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300" variant="outline">
          Rejected
        </Badge>
      );
    }
    if (status === 'kyc_submitted') {
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-300" variant="outline">
          KYC Submitted
        </Badge>
      );
    }
    // pending_onboarding or other
    return (
      <Badge className="bg-orange-100 text-orange-700 border-orange-300" variant="outline">
        {status}
      </Badge>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">Schools</h1>
              <p className="mt-2 text-muted-foreground">Manage and onboard schools</p>
            </div>
            <Button 
              onClick={() => router.push('/dashboard/schools/onboard')}
              className="bg-[#08163d] hover:bg-[#0a1f4f] text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="mr-2 h-4 w-4" />
              Onboard School
            </Button>
          </div>

          {/* Search */}
          <Card className="border-2 border-primary/20 bg-gradient-to-r from-white to-primary/5">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                <Input
                  type="text"
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-primary/30 focus:border-primary focus:ring-primary/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Schools Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Schools</CardTitle>
              <CardDescription>List of all registered schools in the system</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading schools...</div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2 border-primary/20">
                      <TableHead className="font-semibold text-[#08163d]">School</TableHead>
                      <TableHead className="font-semibold text-[#08163d]">Code</TableHead>
                      <TableHead className="font-semibold text-[#08163d]">Contact</TableHead>
                      <TableHead className="font-semibold text-[#08163d]">Status</TableHead>
                      <TableHead className="font-semibold text-[#08163d]">Merchant Status</TableHead>
                      <TableHead className="font-semibold text-[#08163d]">Wallet ID</TableHead>
                      <TableHead className="text-right font-semibold text-[#08163d]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          No schools found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSchools.map((school) => (
                        <TableRow key={school.id} className="hover:bg-primary/5 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300">
                                <School className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="font-medium">{school.name}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{school.code}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{school.email}</div>
                              <div className="text-muted-foreground">{school.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                school.status === 'active'
                                  ? 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200'
                                  : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
                              }
                              variant="outline"
                            >
                              {school.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs text-muted-foreground">
                              {school.business_wallet_id || 'N/A'}
                            </code>
                          </TableCell>
                          <TableCell>
                            {getMerchantStatusBadge((school as any).merchant_status)}
                          </TableCell>
                          <TableCell className="text-right flex items-center justify-end gap-2">
                            {(school as any).merchant_status === 'rejected' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveRejected(school.id)}
                              >
                                Re-approve
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => router.push(`/dashboard/schools/${school.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Re-approve rejected school dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Re-approve School</DialogTitle>
                <DialogDescription>
                  Approve this rejected school for merchant onboarding. Optionally add an approval note.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <p className="text-sm font-medium mb-3">
                  School: {approveSchoolId ? (schools.find((s) => s.id === approveSchoolId)?.name ?? '—') : '—'}
                </p>
                <textarea
                  className="modal-textarea w-full"
                  value={approveReason}
                  onChange={(e) => setApproveReason(e.target.value)}
                  placeholder="Enter approval note (optional)"
                />
              </div>
              <DialogFooter>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                  <Button
                    onClick={submitApproveRejected}
                    disabled={approving}
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {approving ? 'Approving...' : 'Approve'}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
