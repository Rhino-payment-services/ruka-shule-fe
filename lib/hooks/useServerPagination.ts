'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 10;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function normalizePaginationMeta(
  raw: Partial<PaginationMeta> & { page_size?: number; total_pages?: number },
  fallbackPage = 1,
  fallbackPageSize = DEFAULT_PAGE_SIZE,
): PaginationMeta {
  const page = Number(raw.page) > 0 ? Number(raw.page) : fallbackPage;
  const pageSize =
    Number(raw.pageSize ?? raw.page_size) > 0
      ? Number(raw.pageSize ?? raw.page_size)
      : fallbackPageSize;
  const total = Number(raw.total) >= 0 ? Number(raw.total) : 0;
  let totalPages = Number(raw.totalPages ?? raw.total_pages);
  if (!Number.isFinite(totalPages) || totalPages < 1) {
    totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  }
  return { page, pageSize, total, totalPages };
}

export function useServerPagination(initialPage = 1) {
  const [page, setPage] = useState(initialPage);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: initialPage,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const resetPage = useCallback(() => setPage(1), []);

  const applyMeta = useCallback((raw: Parameters<typeof normalizePaginationMeta>[0]) => {
    const next = normalizePaginationMeta(raw);
    setMeta(next);
    if (next.page !== page) {
      setPage(next.page);
    }
  }, [page]);

  return {
    page,
    setPage,
    resetPage,
    meta,
    applyMeta,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

/** Debounce a string value (e.g. search input) before sending to the server. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delayMs]);

  return debounced;
}
