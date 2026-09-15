'use client';

import { cn } from '@/lib/utils';

type StatusTone = 'success' | 'pending' | 'warning' | 'danger' | 'neutral' | 'info';

const TONES: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/80',
  pending: 'bg-[#FFF4C2] text-[#08163d] ring-[#E8A317]/30',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200/80',
  danger: 'bg-red-50 text-red-700 ring-red-200/80',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200/80',
  info: 'bg-[#08163d]/5 text-[#08163d] ring-[#08163d]/10',
};

export function StatusPill({
  children,
  tone = 'neutral',
  dot,
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONES[tone],
        className
      )}
    >
      {dot ? (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-emerald-500',
            tone === 'pending' && 'bg-[#E8A317]',
            tone === 'warning' && 'bg-amber-500',
            tone === 'danger' && 'bg-red-500',
            tone === 'neutral' && 'bg-slate-400',
            tone === 'info' && 'bg-[#08163d]'
          )}
        />
      ) : null}
      {children}
    </span>
  );
}

export function toneFromStatus(status?: string): StatusTone {
  const s = (status || '').toLowerCase();
  if (['active', 'approved', 'completed', 'paid', 'success', 'fulfilled', 'full'].includes(s)) return 'success';
  if (['pending', 'pending_onboarding', 'processing', 'kyc_submitted'].includes(s)) return 'pending';
  if (['rejected', 'failed', 'cancelled', 'canceled', 'inactive', 'unpaid'].includes(s)) return 'danger';
  if (['partial', 'warning', 'locked'].includes(s)) return 'warning';
  if (['waived'].includes(s)) return 'neutral';
  return 'neutral';
}
