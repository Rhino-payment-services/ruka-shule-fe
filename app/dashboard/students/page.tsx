'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Plus, FileSpreadsheet, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

export default function StudentsPage() {
  const router = useRouter();

  const downloadExampleExcel = () => {
    // Create example data with sample students
    const exampleData = [
      {
        'Student ID': 'STU001',
        'Registration ID': 'REG2024001',
        'First Name': 'John',
        'Last Name': 'Doe',
        'Phone': '+256700123456',
        'Class': 'P1',
        'Parent First Name': 'Jane',
        'Parent Last Name': 'Doe',
        'Parent Phone': '+256700123457',
      },
      {
        'Student ID': 'STU002',
        'Registration ID': 'REG2024002',
        'First Name': 'Mary',
        'Last Name': 'Smith',
        'Phone': '+256700123458',
        'Class': 'P2',
        'Parent First Name': 'Robert',
        'Parent Last Name': 'Smith',
        'Parent Phone': '+256700123459',
      },
      {
        'Student ID': 'STU003',
        'Registration ID': 'REG2024003',
        'First Name': 'Peter',
        'Last Name': 'Johnson',
        'Phone': '+256700123460',
        'Class': 'S1',
        'Parent First Name': 'Sarah',
        'Parent Last Name': 'Johnson',
        'Parent Phone': '+256700123461',
      },
    ];

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exampleData);

    // Set column widths for better readability
    const columnWidths = [
      { wch: 12 }, // Student ID
      { wch: 15 }, // Registration ID
      { wch: 12 }, // First Name
      { wch: 12 }, // Last Name
      { wch: 15 }, // Phone
      { wch: 10 }, // Class
      { wch: 18 }, // Parent First Name
      { wch: 18 }, // Parent Last Name
      { wch: 15 }, // Parent Phone
    ];
    worksheet['!cols'] = columnWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Generate Excel file and download
    XLSX.writeFile(workbook, 'student_import_example.xlsx');
  };

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
                onClick={downloadExampleExcel}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Example Excel
              </Button>
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadExampleExcel}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Example Excel
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard/students/import')}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Import Students from Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
