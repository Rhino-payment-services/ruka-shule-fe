'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { studentsAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  buildStudentCreatePayload,
  mapExcelRowToStudent,
  type StudentImportRow,
} from '@/lib/students/import';
import { Upload, FileSpreadsheet, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface DuplicateCandidate {
  id?: string;
  registration_id?: string;
  first_name?: string;
  last_name?: string;
  class?: string;
  phone?: string | null;
  parent_phone?: string | null;
  match_reason?: string;
}

interface ImportRowError {
  row: number;
  error: string;
  candidates?: DuplicateCandidate[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: ImportRowError[];
}

function formatMatchReasons(raw?: string): string {
  if (!raw?.trim()) return '';
  const labels: Record<string, string> = {
    student_phone: 'student phone',
    parent_phone: 'parent phone',
    parent_phone_and_name: 'same name + parent phone',
    name_class: 'same name + class',
    registration_id: 'registration ID',
  };
  const parts = raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => labels[p] || p.replace(/_/g, ' '));
  // de-dupe while preserving order
  const unique = [...new Set(parts)];
  return unique.length ? ` · matched on: ${unique.join('; ')}` : '';
}

function formatCandidate(c: DuplicateCandidate): string {
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
  const reg = c.registration_id || '—';
  const klass = c.class || '—';
  const phone = c.phone || c.parent_phone || '—';
  return `${reg} · ${name} · ${klass} · ${phone}${formatMatchReasons(c.match_reason)}`;
}

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
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
        const jsonData = XLSX.utils.sheet_to_json(firstSheet) as Record<string, unknown>[];

        const students = jsonData
          .map((row) => mapExcelRowToStudent(row))
          .filter((student) => {
            return (
              student.first_name &&
              student.last_name &&
              student.class &&
              (student.phone || student.parent_phone)
            );
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
      } catch {
        toast.error('Failed to parse Excel file', {
          description: 'Please ensure it is a valid Excel file.',
        });
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
        await studentsAPI.create(buildStudentCreatePayload(student));
        importResult.success++;
      } catch (err: unknown) {
        importResult.failed++;
        const axiosErr = err as {
          response?: {
            status?: number;
            data?: { error?: string; candidates?: DuplicateCandidate[] };
          };
        };
        let message = getApiErrorMessage(err, 'Failed to import row');
        const candidates =
          axiosErr.response?.status === 409 && Array.isArray(axiosErr.response.data?.candidates)
            ? axiosErr.response.data.candidates
            : undefined;
        if (axiosErr.response?.status === 409) {
          message = `Duplicate skipped: ${message}`;
        }
        importResult.errors.push({
          row: i + 2,
          error: message,
          candidates,
        });
      }
    }

    setResult(importResult);
    setImporting(false);
    setImportConfirmOpen(false);

    if (importResult.success > 0 && importResult.failed === 0) {
      toast.success(`Imported ${importResult.success} students`);
      setTimeout(() => router.push('/dashboard/students'), 1500);
    } else if (importResult.success > 0) {
      toast.warning(`Imported ${importResult.success}, failed ${importResult.failed}`);
    } else {
      toast.error('Import failed for all rows');
    }
  };

  const openImportConfirm = () => {
    if (!preview.length) {
      toast.error('No students to import');
      return;
    }
    setImportConfirmOpen(true);
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/students')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Import Students</h1>
              <p className="mt-2 text-muted-foreground">
                Upload an Excel file. Include School Fees Amount for per-student overrides.
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Excel</CardTitle>
              <CardDescription>
                Required: First Name, Last Name, Class, and Phone or Parent Phone. Optional: Stream,
                School Fees Amount, Scholarship fields, Parent fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="cursor-pointer rounded-lg border-2 border-dashed p-8 text-center hover:bg-muted/40"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-medium">
                  {file ? file.name : 'Select an Excel file (.xlsx or .xls)'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {preview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Previewing {preview.length} students
                      {preview.length > 20 ? ' (showing first 20)' : ''}
                    </p>
                    <Button onClick={openImportConfirm} disabled={importing}>
                      {importing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Import
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-80 overflow-auto rounded border text-sm">
                    <table className="w-full min-w-[960px]">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="p-2">Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Stream</th>
                          <th className="p-2">Fees</th>
                          <th className="p-2">Scholarship</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Parent</th>
                          <th className="p-2">Parent Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 20).map((s, idx) => (
                          <tr key={`${s.first_name}-${s.last_name}-${idx}`} className="border-t">
                            <td className="p-2 whitespace-nowrap">
                              {s.first_name} {s.last_name}
                            </td>
                            <td className="p-2">{s.class}</td>
                            <td className="p-2">{s.stream || '—'}</td>
                            <td className="p-2">
                              {s.school_fees_amount !== undefined
                                ? s.school_fees_amount.toLocaleString()
                                : '—'}
                            </td>
                            <td className="p-2">
                              {s.scholarship_type
                                ? `${s.scholarship_type}${
                                    s.scholarship_percentage != null &&
                                    !Number.isNaN(s.scholarship_percentage)
                                      ? ` (${s.scholarship_percentage}%)`
                                      : ''
                                  }`
                                : '—'}
                            </td>
                            <td className="p-2 whitespace-nowrap">{s.phone || '—'}</td>
                            <td className="p-2 whitespace-nowrap">
                              {[s.parent_first_name, s.parent_last_name].filter(Boolean).join(' ') ||
                                '—'}
                            </td>
                            <td className="p-2 whitespace-nowrap">{s.parent_phone || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-3 rounded border p-4 text-sm">
                  <p>
                    Success: {result.success} · Failed: {result.failed}
                  </p>
                  {result.errors.map((e) => (
                    <div key={`${e.row}-${e.error}`} className="space-y-1 border-t pt-2 first:border-t-0 first:pt-0">
                      <p className="text-red-600">
                        Row {e.row}: {e.error}
                      </p>
                      {e.candidates && e.candidates.length > 0 && (
                        <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                          {e.candidates.map((c) => (
                            <li key={c.id || formatCandidate(c)}>
                              Matches existing: {formatCandidate(c)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={importConfirmOpen}
            onOpenChange={setImportConfirmOpen}
            description={`Are you sure you want to import ${preview.length} student record(s)? Duplicates will be skipped.`}
            confirmLabel="Import"
            loading={importing}
            onConfirm={handleImport}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
