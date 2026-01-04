'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useEffect } from 'react';
import { schoolsAPI } from '@/lib/api';
import { School, Plus, Search } from 'lucide-react';
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
  business_wallet_id: string;
  created_at: string;
}

export default function SchoolsPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsAPI.list(1, 100);
      setSchools(response.data.data || []);
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
                      <TableHead className="font-semibold text-[#08163d]">Wallet ID</TableHead>
                      <TableHead className="text-right font-semibold text-[#08163d]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
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
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
