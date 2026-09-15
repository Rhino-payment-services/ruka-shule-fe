'use client';

import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function TableHeadLabel({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500', className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
      {children}
    </span>
  );
}
