'use client';

import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Accent = 'navy' | 'gold' | 'muted' | 'emerald';

const ACCENTS: Record<Accent, { icon: string; ring: string }> = {
  navy: { icon: 'bg-[#08163d] text-white', ring: 'ring-[#08163d]/10' },
  gold: { icon: 'bg-[#E8A317] text-white', ring: 'ring-[#E8A317]/15' },
  muted: { icon: 'bg-[#08163d]/70 text-white', ring: 'ring-[#08163d]/8' },
  emerald: { icon: 'bg-emerald-600 text-white', ring: 'ring-emerald-600/10' },
};

export function StatSummaryCard({
  title,
  value,
  description,
  icon: Icon,
  accent = 'navy',
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  accent?: Accent;
  onClick?: () => void;
}) {
  const colors = ACCENTS[accent];
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-white p-3.5 text-left shadow-[0_4px_14px_rgba(8,22,61,0.04)] ring-1 ring-black/3 transition',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(8,22,61,0.08)]'
      )}
    >
      <div className="absolute inset-x-0 top-0 h-12 bg-[radial-gradient(ellipse_at_top_right,_rgba(232,163,23,0.10),_transparent_55%)]" />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">{title}</p>
          <p className="mt-1 truncate text-lg font-semibold tracking-tight text-[#08163d]">{value}</p>
          {description ? <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{description}</p> : null}
        </div>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4', colors.icon, colors.ring)}>
          {onClick ? <ArrowUpRight className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
        </div>
      </div>
    </Wrapper>
  );
}
