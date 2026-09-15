'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PillSearch({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn('relative block w-full', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-full border-0 bg-white pl-10 pr-4 text-sm text-[#08163d] shadow-sm placeholder:text-slate-400 outline-none ring-1 ring-black/5 focus:ring-2 focus:ring-[#E8A317]/35"
      />
    </label>
  );
}
