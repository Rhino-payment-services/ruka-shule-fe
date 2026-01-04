'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Students</h1>
              <p className="mt-2 text-muted-foreground">Manage your school's students</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/students/import')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import from Excel
              </Button>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Student
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>Add, view, and manage students in your school</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">Student management coming soon</p>
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/students/import')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Import Students from Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
