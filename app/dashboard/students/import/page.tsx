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
  normalizeStudentImportRow,
  type StudentImportRow,
  validateStudentImportRow,
} from '@/lib/students/import';
import { Upload, FileSpreadsheet, ArrowLeft, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  blockedReason?: string;
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

function toEditableNumber(value?: number): string {
  return value !== undefined && !Number.isNaN(value) ? String(value) : '';
}

function parseOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export default function ImportStudentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StudentImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [draftErrors, setDraftErrors] = useState<Record<number, string[]>>({});

  const validatePreviewRows = (rows: StudentImportRow[]) => {
    const next: Record<number, string[]> = {};
    rows.forEach((student, index) => {
      const errors = validateStudentImportRow(student);
      if (errors.length > 0) next[index] = errors;
    });
    setDraftErrors(next);
    return next;
  };

  const updatePreviewRow = (
    index: number,
    field: keyof StudentImportRow,
    value: string | number | undefined,
  ) => {
    setPreview((current) => {
      const next = [...current];
      const existing = next[index];
      if (!existing) return current;
      next[index] = normalizeStudentImportRow({
        ...existing,
        [field]: value,
      });
      validatePreviewRows(next);
      return next;
    });
    setResult(null);
  };

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

        const students = jsonData.map((row) => normalizeStudentImportRow(mapExcelRowToStudent(row)));

        if (students.length === 0) {
          toast.error('No valid student data found', {
            description: 'Please check the column headers in your Excel file.',
          });
          return;
        }

        setPreview(students);
        const invalidRows = validatePreviewRows(students);
        toast.success(`Found ${students.length} students`, {
          description:
            Object.keys(invalidRows).length > 0
              ? 'Review and fix highlighted rows before importing.'
              : 'Review the preview and click Import to proceed.',
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

    const invalidRows = validatePreviewRows(preview);
    if (Object.keys(invalidRows).length > 0) {
      toast.error('Fix the highlighted rows first', {
        description: 'Each row needs first name, last name, class, and a phone or parent phone.',
      });
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
        const normalizedMessage = message.toLowerCase();
        const candidates =
          axiosErr.response?.status === 409 && Array.isArray(axiosErr.response.data?.candidates)
            ? axiosErr.response.data.candidates
            : undefined;
        if (normalizedMessage.includes('school context required')) {
          importResult.failed += preview.length - (i + 1);
          importResult.blockedReason =
            'Import blocked: your account is missing school context, so the remaining rows were not attempted. Please log out and back in, or relink this school admin account before retrying.';
          message =
            'Import blocked by missing school context on this account. This is not a row-specific problem.';
          importResult.errors.push({
            row: i + 2,
            error: message,
          });
          break;
        }
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

    if (importResult.blockedReason) {
      toast.error('Import blocked', {
        description: 'Your account is missing school context. Remaining rows were not attempted.',
      });
    } else if (importResult.success > 0 && importResult.failed === 0) {
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
    const invalidRows = validatePreviewRows(preview);
    if (Object.keys(invalidRows).length > 0) {
      toast.error('Fix the highlighted rows first');
      return;
    }
    setImportConfirmOpen(true);
  };

  return (
    <ProtectedRoute allowedRoles={['school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
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

          <Card className="overflow-hidden">
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
                <div className="min-w-0 space-y-3">
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
                  {Object.keys(draftErrors).length > 0 && (
                    <p className="text-sm text-amber-700">
                      Some rows need edits before import. Invalid rows are highlighted below.
                    </p>
                  )}
                  <div className="max-h-[500px] overflow-x-auto overflow-y-auto rounded border text-sm">
                    <table className="min-w-[1800px]">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="p-2">First Name</th>
                          <th className="p-2">Last Name</th>
                          <th className="p-2">Class</th>
                          <th className="p-2">Stream</th>
                          <th className="p-2">Fees</th>
                          <th className="p-2">Scholarship Type</th>
                          <th className="p-2">Scholarship %</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Parent First</th>
                          <th className="p-2">Parent Last</th>
                          <th className="p-2">Parent Phone</th>
                          <th className="p-2">Validation</th>
                          <th className="w-10 p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.slice(0, 20).map((s, idx) => (
                          <tr key={`${s.first_name}-${s.last_name}-${idx}`} className="border-t align-top">
                            <td className="p-2">
                              <Input
                                value={s.first_name}
                                onChange={(e) => updatePreviewRow(idx, 'first_name', e.target.value)}
                                className={draftErrors[idx] ? 'border-amber-500' : undefined}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.last_name}
                                onChange={(e) => updatePreviewRow(idx, 'last_name', e.target.value)}
                                className={draftErrors[idx] ? 'border-amber-500' : undefined}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.class}
                                onChange={(e) => updatePreviewRow(idx, 'class', e.target.value)}
                                className={draftErrors[idx] ? 'border-amber-500' : undefined}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.stream || ''}
                                onChange={(e) => updatePreviewRow(idx, 'stream', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                value={toEditableNumber(s.school_fees_amount)}
                                onChange={(e) =>
                                  updatePreviewRow(
                                    idx,
                                    'school_fees_amount',
                                    parseOptionalNumber(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.scholarship_type || ''}
                                onChange={(e) =>
                                  updatePreviewRow(idx, 'scholarship_type', e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={toEditableNumber(s.scholarship_percentage)}
                                onChange={(e) =>
                                  updatePreviewRow(
                                    idx,
                                    'scholarship_percentage',
                                    parseOptionalNumber(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.phone || ''}
                                onChange={(e) => updatePreviewRow(idx, 'phone', e.target.value)}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.parent_first_name || ''}
                                onChange={(e) =>
                                  updatePreviewRow(idx, 'parent_first_name', e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.parent_last_name || ''}
                                onChange={(e) =>
                                  updatePreviewRow(idx, 'parent_last_name', e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                value={s.parent_phone || ''}
                                onChange={(e) =>
                                  updatePreviewRow(idx, 'parent_phone', e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2 align-top">
                              {draftErrors[idx]?.length ? (
                                <ul className="list-disc pl-4 text-xs text-amber-700">
                                  {draftErrors[idx].map((error) => (
                                    <li key={error}>{error}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-xs text-emerald-700">Ready</span>
                              )}
                            </td>
                            <td className="w-10 p-2 align-top">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreview((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                title="Remove student"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </td>
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
                  {result.blockedReason && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
                      {result.blockedReason}
                    </div>
                  )}
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
