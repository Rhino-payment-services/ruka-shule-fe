'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RukapayLogo } from '@/components/RukapayLogo';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
      window.scrollTo(0, 0);
    }
  }, []);

  // Don't redirect logged-in users - that caused infinite loop with dashboard.
  // Logged-in users can click Sign In to reach dashboard via /login.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08163d]">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#08163d] px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="text-center text-white relative z-10 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-8 flex justify-center">
          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <RukapayLogo size="lg" showText={true} className="text-[#08163d]" />
          </div>
        </div>
        
        <h1 className="mb-6 text-6xl md:text-7xl font-bold tracking-tight">
          School Fee Management
        </h1>
        <p className="mb-12 text-2xl md:text-3xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
          Streamline payments, track fees, and manage students with ease
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-[#08163d] hover:bg-gray-100 shadow-2xl shadow-white/20 hover:shadow-white/30 transition-all duration-200 text-base px-6 py-3 h-auto"
          >
            <Link href={user ? '/dashboard' : '/login'} className="flex items-center gap-2">
              {user ? 'Go to Dashboard' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-white/30 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 shadow-xl text-base px-6 py-3 h-auto hover:border-white/50"
          >
            <Link href="/lookup" className="flex items-center gap-2">
              Student Lookup
              <Sparkles className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Feature Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xl">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Secure Payments</h3>
            <p className="text-gray-600 text-sm">Bank-level security for all transactions</p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xl">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Real-time Tracking</h3>
            <p className="text-gray-600 text-sm">Monitor payments and fees in real-time</p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-gray-200 shadow-xl">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Easy Management</h3>
            <p className="text-gray-600 text-sm">Simple interface for all your needs</p>
          </div>
        </div>
      </div>
    </div>
  );
}
