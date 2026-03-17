'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI } from '@/lib/api';
import { School, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const PENDING_STATUSES = ['pending_onboarding', 'kyc_submitted'];

export default function PendingApprovalsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.list(1, 500);
      const all = response.data.data || [];
      const pending = all.filter(
        (s: SchoolData) =>
          s.merchant_status && PENDING_STATUSES.includes(s.merchant_status)
      );
      setSchools(pending);
    } catch (error) {
      console.error('Failed to load schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(
    (school) =>
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMerchantStatusBadge = (status?: string) => {
    if (!status) return null;
    const isKyc = status === 'kyc_submitted';
    return (
      <Badge
        className={
          isKyc
            ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
            : 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200'
        }
        variant="outline"
      >
        {status === 'kyc_submitted' ? 'KYC Submitted' : 'Pending Onboarding'}
      </Badge>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Pending Approvals
              </h1>
              <p className="mt-2 text-muted-foreground">
                Schools awaiting merchant onboarding or KYC approval
              </p>
            </div>
          </div>

          {/* Search */}
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-white to-orange-50">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-600" />
                <Input
                  type="text"
                  placeholder="Search schools..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-orange-200 focus:border-orange-400 focus:ring-orange-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pending Schools Table */}
          <Card className="border-2 border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Schools Awaiting Approval ({filteredSchools.length})
              </CardTitle>
              <CardDescription>
                These schools have been onboarded but their merchant/wallet setup is
                pending or KYC has been submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : filteredSchools.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-orange-100 p-4 mb-4">
                    <School className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="font-medium text-muted-foreground">
                    No pending approvals
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All schools have completed merchant onboarding
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/dashboard/schools')}
                  >
                    View All Schools
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-orange-50 to-amber-50 border-b-2 border-orange-200">
                      <TableHead className="font-semibold text-orange-900">
                        School
                      </TableHead>
                      <TableHead className="font-semibold text-orange-900">
                        Code
                      </TableHead>
                      <TableHead className="font-semibold text-orange-900">
                        Contact
                      </TableHead>
                      <TableHead className="font-semibold text-orange-900">
                        Merchant Status
                      </TableHead>
                      <TableHead className="text-right font-semibold text-orange-900">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => (
                      <TableRow
                        key={school.id}
                        className="hover:bg-orange-50/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 border border-orange-200">
                              <School className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="font-medium">{school.name}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {school.code}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{school.email}</div>
                            <div className="text-muted-foreground">
                              {school.phone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getMerchantStatusBadge(school.merchant_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-orange-200 hover:bg-orange-50 hover:border-orange-300"
                            onClick={() =>
                              router.push(`/dashboard/schools/${school.id}`)
                            }
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
