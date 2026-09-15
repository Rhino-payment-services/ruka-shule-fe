'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LookupStep } from '@/components/lookup/types';

const STEPS: { id: LookupStep; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'student', label: 'Student' },
  { id: 'pay', label: 'Pay' },
];

const ORDER: LookupStep[] = ['school', 'student', 'pay'];

export function LookupStepper({ step }: { step: LookupStep }) {
  const currentIndex = ORDER.indexOf(step);

  return (
    <ol className="flex items-center justify-center gap-0">
      {STEPS.map((item, index) => {
        const done = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={item.id} className="flex items-center">
            {index > 0 && (
              <span
                className={cn(
                  'mx-2 h-px w-8 sm:mx-3 sm:w-12',
                  index <= currentIndex ? 'bg-[#E8A317]' : 'bg-slate-200',
                )}
                aria-hidden
              />
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                  done && 'bg-[#E8A317] text-white',
                  current && 'bg-[#08163d] text-white',
                  !done && !current && 'border border-slate-200 bg-white text-slate-400',
                )}
              >
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm font-medium',
                  current ? 'text-[#08163d]' : done ? 'text-slate-600' : 'text-slate-400',
                )}
              >
                {item.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
