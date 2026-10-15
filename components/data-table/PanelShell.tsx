'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PanelShell({
  title,
  description,
  toolbar,
  footer,
  children,
  className,
}: {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3',
        className,
      )}
    >
      {(title || description || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-[#08163d]">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-400">{description}</p> : null}
          </div>
          {toolbar ? <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      )}
      <div className="px-4 py-4">{children}</div>
      {footer ? <div className="border-t border-slate-100 px-4 py-3">{footer}</div> : null}
    </div>
  );
}
