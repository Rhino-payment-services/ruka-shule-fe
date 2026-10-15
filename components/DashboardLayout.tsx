'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  Receipt,
  Wallet,
  Settings,
  LogOut,
  Menu,
  X,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RukapayLogo } from '@/components/RukapayLogo';
import { hasPermission, PERMISSIONS, roleLabel } from '@/lib/permissions';
import { firstAccessiblePath } from '@/lib/app-home';
import type { UserRole } from '@/lib/api/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

type NavGroup = 'school' | 'finance' | 'account';

type MenuItem = {
  name: string;
  icon: typeof LayoutDashboard;
  href: string;
  roles?: UserRole[];
  permission?: string;
  group?: NavGroup;
};

const SIDEBAR_WIDTH = 'w-[220px]';
const SIDEBAR_PL = 'lg:pl-[220px]';

const GROUPS: { id: NavGroup; label: string }[] = [
  { id: 'school', label: 'School' },
  { id: 'finance', label: 'Finance' },
  { id: 'account', label: 'Account' },
];

const MENU_ITEMS: MenuItem[] = [
  {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['admin'],
    permission: PERMISSIONS.dashboardView,
  },
  {
    name: 'Schools',
    icon: School,
    href: '/dashboard/schools',
    roles: ['admin'],
    group: 'school',
  },
  {
    name: 'Pending Approvals',
    icon: Clock,
    href: '/dashboard/pending-approvals',
    roles: ['admin'],
    group: 'school',
  },
  {
    name: 'Users',
    icon: Users,
    href: '/dashboard/users',
    roles: ['admin'],
    group: 'school',
  },
  {
    name: 'Members',
    icon: Users,
    href: '/dashboard/members',
    permission: PERMISSIONS.membersRead,
    group: 'account',
  },
  {
    name: 'Students',
    icon: Users,
    href: '/dashboard/students',
    roles: ['admin'],
    permission: PERMISSIONS.studentsRead,
    group: 'school',
  },
  {
    name: 'Fees',
    icon: Receipt,
    href: '/dashboard/fees',
    permission: PERMISSIONS.feesRead,
    group: 'school',
  },
  {
    name: 'Additional Charges',
    icon: Receipt,
    href: '/dashboard/one-off-charges',
    permission: PERMISSIONS.chargesRead,
    group: 'school',
  },
  {
    name: 'Fees Overview',
    icon: Receipt,
    href: '/dashboard/fees-overview',
    permission: PERMISSIONS.feesRead,
    group: 'school',
  },
  {
    name: 'Platform Payments',
    icon: CreditCard,
    href: '/dashboard/platform-payments',
    roles: ['admin'],
    group: 'finance',
  },
  {
    name: 'Payments',
    icon: CreditCard,
    href: '/dashboard/payments',
    permission: PERMISSIONS.paymentsRead,
    group: 'finance',
  },
  {
    name: 'Settlements',
    icon: Wallet,
    href: '/dashboard/settlements',
    permission: PERMISSIONS.settlementsRead,
    group: 'finance',
  },
  {
    name: 'Settings',
    icon: Settings,
    href: '/dashboard/settings',
    roles: ['admin'],
    permission: PERMISSIONS.settingsRead,
    group: 'account',
  },
];

function isActivePath(pathname: string, href: string) {
  const normalizedPath = pathname.replace(/\/$/, '') || '';
  const normalizedHref = href.replace(/\/$/, '');
  return (
    normalizedPath === normalizedHref ||
    (normalizedHref !== '/dashboard' && normalizedPath.startsWith(normalizedHref + '/'))
  );
}

function pageTitleFromPath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '') || '/dashboard';
  if (normalized === '/dashboard') return 'Dashboard';
  if (normalized.startsWith('/dashboard/students/add')) return 'Add Student';
  if (normalized.startsWith('/dashboard/students/import')) return 'Import Students';
  if (normalized.startsWith('/dashboard/schools/onboard')) return 'Onboard School';
  if (/^\/dashboard\/schools\/[^/]+$/.test(normalized)) return 'School Details';
  if (normalized.startsWith('/dashboard/members')) return 'Members';
  if (normalized.startsWith('/dashboard/no-access')) return 'Access';

  const match = MENU_ITEMS.find(
    (item) =>
      normalized === item.href ||
      (item.href !== '/dashboard' && normalized.startsWith(item.href + '/'))
  );
  if (match) return match.name;

  const segment = normalized.split('/').filter(Boolean).pop() || 'Dashboard';
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<NavGroup, boolean>>({
    school: true,
    finance: true,
    account: true,
  });

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const pageTitle = pageTitleFromPath(pathname);
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
    user?.email?.split('@')[0] ||
    'User';

  const visibleItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      if (item.permission && hasPermission(user, item.permission)) return true;
      if (item.roles && user?.role && item.roles.includes(user.role)) return true;
      return false;
    });
  }, [user]);

  const topItems = visibleItems.filter((item) => !item.group);

  const toggleGroup = (id: NavGroup) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderLink = (item: MenuItem, indented = false) => {
    const Icon = item.icon;
    const active = isActivePath(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          'relative flex items-center gap-2 rounded-xl px-2 py-1.5 text-[12px] font-medium transition-colors',
          indented && 'pl-5',
          active
            ? 'bg-[#FFF4C2] text-[#08163d]'
            : 'text-slate-500 hover:bg-[#F8F9FB] hover:text-[#08163d]'
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-[#E8A317]" />
        )}
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', active ? 'text-[#E8A317]' : 'text-slate-400')}
        />
        <span className="truncate text-[12px]">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] font-outfit text-[#08163d]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#08163d]/6 bg-white transition-transform duration-300 ease-in-out lg:translate-x-0',
          SIDEBAR_WIDTH,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-14 items-center justify-between px-4 pt-1">
          <Link href={firstAccessiblePath(user)} className="flex items-center">
            <RukapayLogo size="sm" className="text-[#08163d]" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {topItems.map((item) => renderLink(item))}

          {GROUPS.map((group) => {
            const items = visibleItems.filter((item) => item.group === group.id);
            if (items.length === 0) return null;
            const open = openGroups[group.id];
            return (
              <div key={group.id} className="pt-2.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 hover:text-[#08163d]"
                >
                  <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
                  {group.label}
                </button>
                {open && <div className="mt-0.5 space-y-0.5">{items.map((item) => renderLink(item, true))}</div>}
              </div>
            );
          })}
        </nav>

        <div className="px-2.5 pb-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-slate-500 transition-colors hover:bg-[#F8F9FB] hover:text-[#08163d]"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Log out
          </button>
        </div>
      </aside>

      <div className={cn('flex min-w-0 flex-1 flex-col', SIDEBAR_PL)}>
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[#08163d]/4 bg-[#F4F5F7]/95 px-4 backdrop-blur-sm lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            className="shrink-0 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight text-[#08163d]">
            {pageTitle}
          </h1>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#08163d] text-xs font-semibold text-white">
              {(user?.first_name || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="hidden min-w-0 md:block">
              <div className="truncate text-xs font-medium leading-tight">{displayName}</div>
              <div className="text-[10px] text-slate-400">{roleLabel(user?.role)}</div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 pt-4 lg:px-6 lg:pt-5">{children}</main>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#08163d]/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
