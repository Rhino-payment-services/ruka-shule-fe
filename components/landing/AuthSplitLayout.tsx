'use client';

import { GraduationCap, Loader2 } from 'lucide-react';
import { HeroBackdrop } from '@/components/landing/HeroBackdrop';
import { RukapayLogo } from '@/components/RukapayLogo';

const GOLD = '#E8A317';

export function AuthSplitLayout({
  loading = false,
  loadingLabel = 'Loading…',
  children,
}: {
  loading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-[#08163d]" />
          <p className="text-sm text-[#08163d]/70">{loadingLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-hidden bg-white text-[#08163d]">
      <div className="relative flex w-full flex-col items-center justify-center overflow-y-auto px-6 py-12 md:w-1/2 md:px-12">
        <HeroBackdrop />
        <div className="relative z-10 w-full max-w-md">{children}</div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#08163d] md:flex md:w-1/2 md:flex-col md:items-center md:justify-center md:px-12">
        <HeroBackdrop variant="dark" />
        <div className="relative z-10 max-w-md text-center font-outfit text-white">
          <p className="mb-6 inline-flex items-center gap-2 text-sm font-normal text-white/70">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8A317]/20">
              <GraduationCap className="h-3.5 w-3.5 text-[#E8A317]" />
            </span>
            Rukashule
          </p>
          <h2 className="text-5xl font-bold leading-[1.12] tracking-tight">
            Enter the future
            <span className="mt-1 block" style={{ color: GOLD }}>
              of school fees.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-sm text-base font-normal leading-relaxed text-white/70">
            Schools collect. Parents pay. Everyone stays on the same page.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {['Secure Payments', 'Live Balances', 'Easy Management'].map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthBrandHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 font-outfit">
      <RukapayLogo size="lg" className="mb-6 text-[#08163d]" />
      <h1 className="mb-2 text-4xl font-bold tracking-tight text-[#08163d]">{title}</h1>
      <p className="text-lg font-normal text-slate-500">{subtitle}</p>
    </div>
  );
}
