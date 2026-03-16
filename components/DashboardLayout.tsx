'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RukapayLogo } from '@/components/RukapayLogo';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      href: '/dashboard',
      roles: ['admin', 'school_admin'],
    },
    {
      name: 'Schools',
      icon: School,
      href: '/dashboard/schools',
      roles: ['admin'],
    },
    {
      name: 'Students',
      icon: Users,
      href: '/dashboard/students',
      roles: ['school_admin'],
    },
    {
      name: 'Payments',
      icon: CreditCard,
      href: '/dashboard/payments',
      roles: ['school_admin'],
    },
    {
      name: 'Fees',
      icon: Receipt,
      href: '/dashboard/fees',
      roles: ['school_admin'],
    },
    {
      name: 'Settings',
      icon: Settings,
      href: '/dashboard/settings',
      roles: ['admin', 'school_admin'],
    },
  ].filter((item) => item.roles.includes(user?.role || ''));

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-white/80 backdrop-blur-xl shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center justify-between px-6 bg-primary/5">
            <RukapayLogo size="md" showText={true} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-2 px-4 py-6">
            <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3">
              Menu
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const normalizedPath = pathname?.replace(/\/$/, '') || '';
              const normalizedHref = item.href.replace(/\/$/, '');
              const isActive =
                normalizedPath === normalizedHref ||
                (normalizedHref !== '/dashboard' && normalizedPath.startsWith(normalizedHref + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[#08163d] text-white shadow-lg'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="border-t bg-gray-50 p-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-muted-foreground hover:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-white/80 backdrop-blur-xl shadow-sm px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1" />

          {/* Right side */}
          <div className="flex items-center gap-3 pl-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shadow-md">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block">
              <div className="text-sm font-medium">
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
