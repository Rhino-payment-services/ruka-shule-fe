'use client';

import { ArrowLeft, ArrowRight, Loader2, School, Search } from 'lucide-react';
import type { PublicSchoolLookupResponse } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SchoolStepProps {
  schoolIdentifier: string;
  onSchoolIdentifierChange: (value: string) => void;
  school: PublicSchoolLookupResponse | null;
  schoolClasses: string[];
  selectedClass: string;
  loading: boolean;
  error: string;
  onLookup: (e: React.FormEvent) => void;
  onClassChange: (value: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export function SchoolStep({
  schoolIdentifier,
  onSchoolIdentifierChange,
  school,
  schoolClasses,
  selectedClass,
  loading,
  error,
  onLookup,
  onClassChange,
  onContinue,
  onBack,
}: SchoolStepProps) {
  if (!school) {
    return (
      <form onSubmit={onLookup} className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[#08163d]">Find the school</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enter the school code or merchant ID from the school.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="school_identifier">School code or merchant ID</Label>
          <div className="relative">
            <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="school_identifier"
              type="text"
              value={schoolIdentifier}
              onChange={(e) => onSchoolIdentifierChange(e.target.value)}
              placeholder="e.g. SCH001"
              className="h-11 rounded-xl border-slate-200 pl-10"
              autoFocus
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
          disabled={loading || !schoolIdentifier.trim()}
          className="h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Looking up school…
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Find school
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#08163d]"
      >
        <ArrowLeft className="h-4 w-4" />
        Different school
      </button>

      <div className="rounded-2xl border border-slate-100 bg-[#08163d]/[0.03] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF4C2]">
            <School className="h-5 w-5 text-[#E8A317]" />
          </span>
          <div>
            <p className="font-semibold text-[#08163d]">{school.name}</p>
            <p className="mt-0.5 text-sm text-slate-500">Code {school.code}</p>
            {school.merchant_code && (
              <p className="text-sm text-slate-500">Merchant {school.merchant_code}</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="class">Select class</Label>
        {schoolClasses.length === 0 ? (
          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            No classes found for this school yet. You can still search for a student.
          </p>
        ) : (
          <>
            <Select value={selectedClass} onValueChange={onClassChange}>
              <SelectTrigger id="class" className="h-11 w-full rounded-xl border-slate-200">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent className="max-h-75">
                {schoolClasses.map((className) => (
                  <SelectItem key={className} value={className}>
                    {className}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">Only classes at this school are listed.</p>
          </>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {(schoolClasses.length === 0 || selectedClass) && (
        <Button
          onClick={onContinue}
          className="h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90"
          size="lg"
          disabled={schoolClasses.length > 0 && !selectedClass}
        >
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
