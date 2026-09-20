'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { firstAccessiblePath } from '@/lib/app-home';
import { Button } from '@/components/ui/button';
import { HeroBackdrop } from '@/components/landing/HeroBackdrop';
import { SiteHeader } from '@/components/landing/SiteHeader';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Receipt,
  Search,
  ShieldCheck,
  Activity,
  Zap,
} from 'lucide-react';

const GOLD = '#E8A317';

export default function Home() {
  const { user, loading } = useAuth();
  const startHref = user ? firstAccessiblePath(user) : '/login';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.scrollRestoration = 'manual';
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <Loader2 className="h-10 w-10 animate-spin text-[#08163d]" />
          <p className="text-sm text-[#08163d]/70">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#08163d]">
      <SiteHeader />

      <main>
        <section
          id="home"
          className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden scroll-mt-20 lg:h-[calc(100dvh-4rem)] lg:max-h-[calc(100dvh-4rem)]"
        >
          <HeroBackdrop />
          <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-8 px-4 py-10 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:py-6">
            <div className="max-w-lg">
              <p className="mb-4 flex items-center gap-2 text-sm text-slate-500">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4C2]">
                  <GraduationCap className="h-3.5 w-3.5 text-[#E8A317]" />
                </span>
                Rukashule <span className="text-slate-300">|</span> Fees that just work
              </p>
              <h1 className="text-4xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[2.75rem] lg:leading-[1.15] xl:text-5xl">
                Pay once. Learn on.
                <span className="mt-1 block" style={{ color: GOLD }}>
                  No queues. No guesswork.
                </span>
              </h1>
              <p className="mt-5 text-base leading-relaxed text-slate-600 lg:mt-4">
                Look up a student, settle what is due, and see the balance
                update — from a phone. Schools collect. Parents pay. Everyone
                stays on the same page.
              </p>
              <div className="mt-8 flex flex-wrap gap-3 lg:mt-7">
                <Button
                  asChild
                  className="rounded-full bg-[#08163d] px-6 text-white hover:bg-[#08163d]/90"
                >
                  <Link href={startHref} className="flex items-center gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-slate-200 px-6">
                  <Link href="/lookup" className="flex items-center gap-2">
                    Find a student
                    <Search className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <ul className="mt-8 grid gap-5 sm:grid-cols-3">
                <li>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4 text-[#E8A317]" />
                    Paid safely
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Every payment goes through Rukapay.
                  </p>
                </li>
                <li>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-[#E8A317]" />
                    Live balances
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    See what is paid and what is still due.
                  </p>
                </li>
                <li>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <Zap className="h-4 w-4 text-[#E8A317]" />
                    One desk
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    Students, fees, and receipts together.
                  </p>
                </li>
              </ul>
            </div>

            <div className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[30rem] lg:h-full lg:max-h-[32rem] lg:max-w-none">
              <div
                className="absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FFF4C2] sm:h-80 sm:w-80 lg:top-4"
                aria-hidden
              />
              <div className="relative z-10 mx-auto h-full w-[80%]">
                <Image
                  src="/images/student.png"
                  alt="Student checking a school fee payment on a phone"
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, 80vw"
                  className="object-contain object-bottom"
                />
              </div>
              <div className="absolute left-0 top-10 z-20 w-40 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:w-44 lg:top-8">
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-xs font-semibold text-[#08163d]">Fees received</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Term balance updated</p>
                <p className="mt-2 text-sm font-semibold text-[#08163d]">UGX 120,000</p>
              </div>
              <div className="absolute left-2 top-[11.5rem] z-20 hidden w-32 animate-hero-float items-center gap-2 rounded-full border border-slate-100 bg-white/95 px-2.5 py-1.5 shadow-sm lg:flex">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF4C2]">
                  <Receipt className="h-3.5 w-3.5 text-[#E8A317]" />
                </span>
                <p className="text-[11px] font-medium text-[#08163d]">Receipt ready</p>
              </div>
              <div className="absolute right-4 top-6 z-20 hidden animate-hero-float-delayed lg:flex">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                  <GraduationCap className="h-5 w-5 text-[#E8A317]" />
                </span>
              </div>
              <div className="absolute bottom-8 right-0 z-20 hidden w-36 animate-hero-float items-center gap-2 rounded-2xl border border-slate-100 bg-white/95 px-3 py-2 shadow-sm lg:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#08163d]/5">
                  <BookOpen className="h-3.5 w-3.5 text-[#08163d]" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-[#08163d]">Term 2 due</p>
                  <p className="text-[10px] text-slate-500">Balance live</p>
                </div>
              </div>
            </div>
          </div>
          <svg
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10 block w-full text-[#E8A317]"
            viewBox="0 0 1440 56"
            fill="none"
            aria-hidden
          >
            <path
              d="M0 56h1440V22c-240 22-480 30-720 18S240 6 0 24v32Z"
              fill="currentColor"
              opacity="0.28"
            />
          </svg>
        </section>
      </main>
    </div>
  );
}
