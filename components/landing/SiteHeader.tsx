'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { firstAccessiblePath } from '@/lib/app-home';
import { Button } from '@/components/ui/button';
import { RukapayLogo } from '@/components/RukapayLogo';

export function SiteHeader() {
  const { user } = useAuth();
  const startHref = user ? firstAccessiblePath(user) : '/login';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <RukapayLogo size="sm" className="text-[#08163d]" />
          <span className="hidden h-6 w-px bg-slate-200 sm:block" />
          <span className="text-sm font-semibold tracking-tight">Rukashule</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="rounded-full border-slate-200 px-4">
            <Link href={startHref}>{user ? 'Continue' : 'Sign In'}</Link>
          </Button>
          <Button
            asChild
            className="rounded-full bg-[#08163d] px-4 text-white hover:bg-[#08163d]/90"
          >
            <Link href="/lookup" className="flex items-center gap-1.5">
              Student Lookup
              <Search className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
