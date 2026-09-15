'use client';

import { type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ActivityItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
};

export function ActivityListCard({
  title,
  icon,
  items,
  emptyLabel,
  viewAllLabel,
  onViewAll,
}: {
  title: string;
  icon?: ReactNode;
  items: ActivityItem[];
  emptyLabel: string;
  viewAllLabel?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold text-[#08163d]">{title}</h3>
      </div>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-xl bg-[#F8F9FB] px-2.5 py-2 transition hover:bg-[#FFF4C2]/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm">
                {item.badge ?? <span className="text-[10px] font-semibold text-[#08163d]">RS</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[#08163d]">{item.title}</p>
                {item.subtitle ? (
                  <p className="truncate font-mono text-[10px] text-slate-400">{item.subtitle}</p>
                ) : null}
                {item.meta ? (
                  <span className="mt-0.5 inline-flex rounded-full bg-[#FFF4C2] px-1.5 py-0.5 text-[10px] font-medium text-[#08163d]">
                    {item.meta}
                  </span>
                ) : null}
              </div>
              {item.trailing}
              {item.onClick ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={item.onClick}
                  className="h-7 shrink-0 px-2 text-xs text-[#08163d]/70 hover:text-[#08163d]"
                >
                  View
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {onViewAll && viewAllLabel ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full text-xs text-[#08163d]/70 hover:bg-[#FFF4C2]/40 hover:text-[#08163d]"
          onClick={onViewAll}
        >
          {viewAllLabel}
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
