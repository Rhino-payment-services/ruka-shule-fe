'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ListPaginationProps {
  page: number;
  totalPages: number;
  loading?: boolean;
  total?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function ListPagination({
  page,
  totalPages,
  loading = false,
  total,
  onPageChange,
  className,
}: ListPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1 || loading}
        className="h-8 rounded-full border-slate-200 px-3 text-xs text-[#08163d] hover:bg-[#F8F9FB]"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Previous
      </Button>
      <p className="text-xs text-slate-400">
        Page {safePage} of {safeTotalPages}
        {typeof total === 'number' ? ` · ${total} total` : null}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= safeTotalPages || loading}
        className="h-8 rounded-full border-slate-200 px-3 text-xs text-[#08163d] hover:bg-[#F8F9FB]"
      >
        Next
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
