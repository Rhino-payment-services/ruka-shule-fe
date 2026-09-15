'use client';

import { ArrowLeft, GraduationCap, Loader2, School, Search, User, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Student } from '@/components/lookup/types';

interface StudentStepProps {
  schoolName?: string;
  selectedClass: string;
  studentId: string;
  onStudentIdChange: (value: string) => void;
  students: Student[];
  loading: boolean;
  lookupPaymentLoading: boolean;
  error: string;
  onSearch: (e: React.FormEvent) => void;
  onPay: (student: Student) => void;
  onBack: () => void;
}

export function StudentStep({
  schoolName,
  selectedClass,
  studentId,
  onStudentIdChange,
  students,
  loading,
  lookupPaymentLoading,
  error,
  onSearch,
  onPay,
  onBack,
}: StudentStepProps) {
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#08163d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#08163d]">Find the student</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter the registration ID from the school.
        </p>
      </div>

      {schoolName && (
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
          <p className="text-sm font-medium text-[#08163d]">{schoolName}</p>
          <p className="text-xs text-slate-500">{selectedClass || 'All classes'}</p>
        </div>
      )}

      <form onSubmit={onSearch} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="registration_id">Registration ID</Label>
          <div className="relative">
            <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="registration_id"
              type="text"
              value={studentId}
              onChange={(e) => onStudentIdChange(e.target.value)}
              placeholder="Enter registration ID"
              className="h-11 rounded-xl border-slate-200 pl-10"
            />
          </div>
        </div>
        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading || !studentId.trim()}
          className="h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search student
            </>
          )}
        </Button>
      </form>

      {students.length > 0 && (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#08163d]/5">
                  <User className="h-5 w-5 text-[#08163d]" />
                </span>
                <div>
                  <p className="font-semibold text-[#08163d]">
                    {student.first_name} {student.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{student.registration_id}</p>
                </div>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <span>{student.class}</span>
                </div>
                {student.stream && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Stream</span>
                    <span>{student.stream}</span>
                  </div>
                )}
                {student.gender && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span>{student.gender}</span>
                  </div>
                )}
                {student.school_name && (
                  <div className="flex items-center gap-2 text-slate-600 sm:col-span-2">
                    <School className="h-4 w-4 text-slate-400" />
                    <span>{student.school_name}</span>
                  </div>
                )}
              </dl>
              {lookupPaymentLoading && (
                <p className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading balances…
                </p>
              )}
              <Button
                onClick={() => onPay(student)}
                disabled={lookupPaymentLoading}
                className="mt-4 h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90"
              >
                {lookupPaymentLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                View balances & pay
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
