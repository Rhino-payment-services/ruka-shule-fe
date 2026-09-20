import { hasPermission, PERMISSIONS } from '@/lib/permissions';

type AppUser = {
  role?: string;
  permissions?: string[];
  school_id?: string;
} | null | undefined;

const SCHOOL_HOME_ROUTES: { href: string; permission: string }[] = [
  { href: '/dashboard', permission: PERMISSIONS.dashboardView },
  { href: '/dashboard/students', permission: PERMISSIONS.studentsRead },
  { href: '/dashboard/fees', permission: PERMISSIONS.feesRead },
  { href: '/dashboard/one-off-charges', permission: PERMISSIONS.chargesRead },
  { href: '/dashboard/payments', permission: PERMISSIONS.paymentsRead },
  { href: '/dashboard/settlements', permission: PERMISSIONS.settlementsRead },
  { href: '/dashboard/members', permission: PERMISSIONS.membersRead },
  { href: '/dashboard/settings', permission: PERMISSIONS.settingsRead },
];

export function firstAccessiblePath(user: AppUser): string {
  if (!user) return '/login';
  if (user.role === 'school_admin' && !user.school_id) {
    return '/dashboard/schools/onboard';
  }
  if (user.role === 'admin') return '/dashboard';

  for (const route of SCHOOL_HOME_ROUTES) {
    if (hasPermission(user, route.permission)) return route.href;
  }
  if (hasPermission(user, PERMISSIONS.authChangePassword)) {
    return '/dashboard/settings';
  }
  return '/dashboard/no-access';
}
