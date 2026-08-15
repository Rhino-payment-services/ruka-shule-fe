'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    <div className={`flex items-center justify-between gap-3 ${className ?? ''}`}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(safePage - 1)}
        disabled={safePage <= 1 || loading}
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </Button>
      <p className="text-sm text-muted-foreground">
        Page {safePage} of {safeTotalPages}
        {typeof total === 'number' ? ` · ${total} total` : null}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onPageChange(safePage + 1)}
        disabled={safePage >= safeTotalPages || loading}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
