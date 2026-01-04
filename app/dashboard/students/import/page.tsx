'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { studentsAPI } from '@/lib/api';
import { Upload, FileSpreadsheet, ArrowLeft, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import * as XLSX from 'xlsx';

interface StudentRow {
  student_id: string;
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  parent_id?: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setFile(selectedFile);
    setError('');
    setResult(null);
    parseExcelFile(selectedFile);
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];

        // Map Excel columns to our student structure
        // Expected columns: Student ID, Registration ID, First Name, Last Name, Phone, Class, Parent ID (optional)
        const students: StudentRow[] = jsonData.map((row, index) => {
          // Try different possible column names
          const studentId = row['Student ID'] || row['student_id'] || row['StudentID'] || row['STUDENT_ID'] || '';
          const regId = row['Registration ID'] || row['registration_id'] || row['RegistrationID'] || row['REG_ID'] || '';
          const firstName = row['First Name'] || row['first_name'] || row['FirstName'] || row['FIRST_NAME'] || '';
          const lastName = row['Last Name'] || row['last_name'] || row['LastName'] || row['LAST_NAME'] || '';
          const phone = row['Phone'] || row['phone'] || row['PHONE'] || '';
          const className = row['Class'] || row['class'] || row['CLASS'] || '';
          const parentId = row['Parent ID'] || row['parent_id'] || row['ParentID'] || row['PARENT_ID'] || undefined;

          return {
            student_id: String(studentId).trim(),
            registration_id: String(regId).trim(),
            first_name: String(firstName).trim(),
            last_name: String(lastName).trim(),
            phone: String(phone).trim(),
            class: String(className).trim(),
            parent_id: parentId ? String(parentId).trim() : undefined,
          };
        }).filter((student) => {
          // Filter out empty rows
          return student.student_id && student.first_name && student.last_name;
        });

        if (students.length === 0) {
          setError('No valid student data found in the Excel file. Please check the column headers.');
          return;
        }

        setPreview(students);
      } catch (err) {
        setError('Failed to parse Excel file. Please ensure it is a valid Excel file.');
        console.error('Excel parsing error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview.length) {
      setError('No students to import');
      return;
    }

    setImporting(true);
    setError('');
    setResult(null);

    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Import students one by one
    for (let i = 0; i < preview.length; i++) {
      const student = preview[i];
      try {
        await studentsAPI.create({
          student_id: student.student_id,
          registration_id: student.registration_id,
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          class: student.class,
          parent_id: student.parent_id,
        });
        importResult.success++;
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { error?: string } }; message?: string };
        importResult.failed++;
        importResult.errors.push({
          row: i + 2, // +2 because Excel rows start at 1 and we have a header
          error: axiosError.response?.data?.error || axiosError.message || 'Unknown error',
        });
      }
    }

    setResult(importResult);
    setImporting(false);
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/students')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#08163d] to-[#0a1f4f] bg-clip-text text-transparent">
                Import Students from Excel
              </h1>
              <p className="mt-2 text-muted-foreground">
                Upload an Excel file to bulk import students into your school
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <Alert className="bg-red-50 border-red-200 text-red-800">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Import Result */}
          {result && (
            <Alert
              className={
                result.failed === 0
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-yellow-50 border-yellow-200 text-yellow-800'
              }
            >
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {result.failed === 0 ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <span className="font-semibold">
                      Import completed: {result.success} succeeded, {result.failed} failed
                    </span>
                  </div>
                  {result.errors.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        {result.errors.slice(0, 10).map((err, idx) => (
                          <li key={idx}>
                            Row {err.row}: {err.error}
                          </li>
                        ))}
                        {result.errors.length > 10 && (
                          <li>... and {result.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* File Upload Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-green-200 border border-green-300">
                  <FileSpreadsheet className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Upload Excel File</CardTitle>
                  <CardDescription>
                    Select an Excel file (.xlsx or .xls) with student data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {file ? file.name : 'Click to select or drag and drop'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2"
                  >
                    Select File
                  </Button>
                </div>

                {/* Excel Format Instructions */}
                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Expected Excel Format:</p>
                  <p className="text-muted-foreground mb-2">
                    Your Excel file should have the following columns (case-insensitive):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Student ID (required)</li>
                    <li>Registration ID (required)</li>
                    <li>First Name (required)</li>
                    <li>Last Name (required)</li>
                    <li>Phone (required)</li>
                    <li>Class (required)</li>
                    <li>Parent ID (optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview ({preview.length} students)</CardTitle>
                <CardDescription>
                  Review the data before importing. Only valid rows will be imported.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="max-h-96 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Student ID</th>
                          <th className="p-2 text-left">First Name</th>
                          <th className="p-2 text-left">Last Name</th>
                          <th className="p-2 text-left">Phone</th>
                          <th className="p-2 text-left">Class</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 50).map((student, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{student.student_id}</td>
                            <td className="p-2">{student.first_name}</td>
                            <td className="p-2">{student.last_name}</td>
                            <td className="p-2">{student.phone}</td>
                            <td className="p-2">{student.class}</td>
                          </tr>
                        ))}
                        {preview.length > 50 && (
                          <tr>
                            <td colSpan={5} className="p-2 text-center text-muted-foreground">
                              ... and {preview.length - 50} more rows
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreview([]);
                        setResult(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      disabled={importing}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      onClick={handleImport}
                      disabled={importing || preview.length === 0}
                      className="flex-1 bg-[#08163d] hover:bg-[#0a1f4f] text-white"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Import {preview.length} Students
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

