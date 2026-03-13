'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { studentsAPI } from '@/lib/api';
import { Upload, FileSpreadsheet, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface StudentRow {
  registration_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  class: string;
  stream?: string;  // Arts, Sciences, General, etc.
  scholarship_type?: string;  // Full, Partial, Merit, etc.
  scholarship_percentage?: number;  // Discount percentage
  parent_first_name?: string;
  parent_last_name?: string;
  parent_phone?: string;
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error('Invalid file type', {
        description: 'Please select an Excel file (.xlsx or .xls)',
      });
      return;
    }

    setFile(selectedFile);
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

        const students: StudentRow[] = jsonData.map((row) => {
          const registrationId =
            row['Registration ID'] ||
            row['registration_id'] ||
            row['RegistrationID'] ||
            row['REG_ID'] ||
            row['Student ID'] ||
            row['student_id'] ||
            row['StudentID'] ||
            row['STUDENT_ID'] ||
            '';
          const firstName =
            row['First Name'] ||
            row['first_name'] ||
            row['FirstName'] ||
            row['FIRST_NAME'] ||
            '';
          const lastName =
            row['Last Name'] ||
            row['last_name'] ||
            row['LastName'] ||
            row['LAST_NAME'] ||
            '';
          const phone = row['Phone'] || row['phone'] || row['PHONE'] || '';
          const className = row['Class'] || row['class'] || row['CLASS'] || '';
          const parentFirstName =
            row['Parent First Name'] ||
            row['parent_first_name'] ||
            row['ParentFirstName'] ||
            row['PARENT_FIRST_NAME'] ||
            undefined;
          const parentLastName =
            row['Parent Last Name'] ||
            row['parent_last_name'] ||
            row['ParentLastName'] ||
            row['PARENT_LAST_NAME'] ||
            undefined;
          const parentPhone =
            row['Parent Phone'] ||
            row['parent_phone'] ||
            row['ParentPhone'] ||
            row['PARENT_PHONE'] ||
            undefined;
          
          // New fields: Stream and Scholarship
          const stream =
            row['Stream'] ||
            row['stream'] ||
            row['STREAM'] ||
            row['Subject Combination'] ||
            undefined;
          const scholarshipType =
            row['Scholarship Type'] ||
            row['scholarship_type'] ||
            row['ScholarshipType'] ||
            row['SCHOLARSHIP_TYPE'] ||
            undefined;
          const scholarshipPercentage =
            row['Scholarship Percentage'] ||
            row['scholarship_percentage'] ||
            row['ScholarshipPercentage'] ||
            row['SCHOLARSHIP_PERCENTAGE'] ||
            row['Discount'] ||
            row['discount'] ||
            undefined;

          return {
            registration_id: String(registrationId).trim(),
            first_name: String(firstName).trim(),
            last_name: String(lastName).trim(),
            phone: String(phone).trim(),
            class: String(className).trim(),
            stream: stream ? String(stream).trim() : undefined,
            scholarship_type: scholarshipType ? String(scholarshipType).trim() : undefined,
            scholarship_percentage: scholarshipPercentage ? parseFloat(String(scholarshipPercentage)) : undefined,
            parent_first_name: parentFirstName ? String(parentFirstName).trim() : undefined,
            parent_last_name: parentLastName ? String(parentLastName).trim() : undefined,
            parent_phone: parentPhone ? String(parentPhone).trim() : undefined,
          };
        }).filter((student) => {
          return student.registration_id && student.first_name && student.last_name;
        });

        if (students.length === 0) {
          toast.error('No valid student data found', {
            description: 'Please check the column headers in your Excel file.',
          });
          return;
        }

        setPreview(students);
        toast.success(`Found ${students.length} students`, {
          description: 'Review the preview and click Import to proceed.',
        });
      } catch (err) {
        toast.error('Failed to parse Excel file', {
          description: 'Please ensure it is a valid Excel file.',
        });
        console.error('Excel parsing error:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview.length) {
      toast.error('No students to import');
      return;
    }

    setImporting(true);
    setResult(null);

    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < preview.length; i++) {
      const student = preview[i];
      try {
        const payload: any = {
          registration_id: student.registration_id,
          first_name: student.first_name,
          last_name: student.last_name,
          phone: student.phone,
          class: student.class,
        };

        // Stream/Subject combination
        if (student.stream) {
          payload.stream = student.stream;
        }

        // Scholarship information
        if (student.scholarship_type) {
          payload.scholarship_type = student.scholarship_type;
        }
        if (student.scholarship_percentage && !isNaN(student.scholarship_percentage)) {
          payload.scholarship_percentage = student.scholarship_percentage;
        }

        // Parent information
        if (student.parent_first_name) {
          payload.parent_first_name = student.parent_first_name;
        }
        if (student.parent_last_name) {
          payload.parent_last_name = student.parent_last_name;
        }
        if (student.parent_phone) {
          payload.parent_phone = student.parent_phone;
        }

        await studentsAPI.create(payload);
        importResult.success++;
      } catch (err: unknown) {
        const axiosError = err as {
          response?: { data?: { error?: string } };
          message?: string;
        };
        importResult.failed++;
        importResult.errors.push({
          row: i + 2,
          error:
            axiosError.response?.data?.error ||
            axiosError.message ||
            'Unknown error',
        });
      }
    }

    setResult(importResult);
    setImporting(false);

    if (importResult.failed === 0) {
      toast.success('Import completed successfully!', {
        description: `Successfully imported ${importResult.success} students.`,
      });
      // Clear preview and redirect immediately
      setPreview([]);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Redirect to students list to see the imported students
      router.push('/dashboard/students');
    } else {
      toast.warning('Import completed with errors', {
        description: `${importResult.success} succeeded, ${importResult.failed} failed. Check the errors below.`,
      });
      // Still redirect if some succeeded, but show errors
      if (importResult.success > 0) {
        setTimeout(() => {
          router.push('/dashboard/students');
        }, 3000);
      }
    }
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6 max-w-5xl mx-auto">
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

          {result && result.failed > 0 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-800">Import Errors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-yellow-800">
                    {result.errors.length} error(s) occurred during import:
                  </p>
                  <div className="max-h-48 overflow-auto">
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800">
                      {result.errors.slice(0, 20).map((err, idx) => (
                        <li key={idx}>
                          Row {err.row}: {err.error}
                        </li>
                      ))}
                      {result.errors.length > 20 && (
                        <li>... and {result.errors.length - 20} more errors</li>
                      )}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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

                <div className="bg-muted/50 rounded-lg p-4 text-sm">
                  <p className="font-medium mb-2">Expected Excel Format:</p>
                  <p className="text-muted-foreground mb-2">
                    Your Excel file should have the following columns (case-insensitive):
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>
                      Registration ID (required) - School&apos;s internal student identifier
                    </li>
                    <li>First Name (required)</li>
                    <li>Last Name (required)</li>
                    <li>Phone (required)</li>
                    <li>Class (required)</li>
                    <li>Stream (optional) - Arts, Sciences, General, Business, Technical</li>
                    <li>Scholarship Type (optional) - Full, Partial, Merit, Need-based, Sports</li>
                    <li>Scholarship Percentage (optional) - Discount % (0-100)</li>
                    <li>Parent First Name (optional)</li>
                    <li>Parent Last Name (optional)</li>
                    <li>Parent Phone (optional)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

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
                          <th className="p-2 text-left">Registration ID</th>
                          <th className="p-2 text-left">First Name</th>
                          <th className="p-2 text-left">Last Name</th>
                          <th className="p-2 text-left">Phone</th>
                          <th className="p-2 text-left">Class</th>
                          <th className="p-2 text-left">Stream</th>
                          <th className="p-2 text-left">Scholarship</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 50).map((student, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2">{student.registration_id}</td>
                            <td className="p-2">{student.first_name}</td>
                            <td className="p-2">{student.last_name}</td>
                            <td className="p-2">{student.phone}</td>
                            <td className="p-2">{student.class}</td>
                            <td className="p-2">{student.stream || '-'}</td>
                            <td className="p-2">
                              {student.scholarship_type 
                                ? `${student.scholarship_type}${student.scholarship_percentage ? ` (${student.scholarship_percentage}%)` : ''}`
                                : '-'}
                            </td>
                          </tr>
                        ))}
                        {preview.length > 50 && (
                          <tr>
                            <td
                              colSpan={7}
                              className="p-2 text-center text-muted-foreground"
                            >
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
