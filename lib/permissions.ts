export type SchoolRole = 'school_admin' | 'owner' | 'headteacher' | 'bursar' | 'teacher';

export const SCHOOL_ROLES: SchoolRole[] = [
  'school_admin',
  'owner',
  'headteacher',
  'bursar',
  'teacher',
];

export const PERMISSIONS = {
  dashboardView: 'dashboard.view',
  studentsRead: 'students.read',
  studentsWrite: 'students.write',
  feesRead: 'fees.read',
  feesWrite: 'fees.write',
  chargesRead: 'charges.read',
  chargesWrite: 'charges.write',
  paymentsRead: 'payments.read',
  settlementsRead: 'settlements.read',
  settlementsWrite: 'settlements.write',
  settingsRead: 'settings.read',
  settingsWrite: 'settings.write',
  membersRead: 'members.read',
  membersWrite: 'members.write',
  rolesManage: 'roles.manage',
  authChangePassword: 'auth.change_password',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  code: string,
): boolean {
  if (!user) return false;
  return (user.permissions || []).includes(code);
}

export function canWrite(
  user: { role?: string; permissions?: string[] } | null | undefined,
  resource: string,
): boolean {
  return hasPermission(user, `${resource}.write`);
}

export function roleLabel(role?: string) {
  switch (role) {
    case 'admin':
      return 'Platform Admin';
    case 'school_admin':
      return 'School Admin';
    case 'owner':
      return 'School Owner';
    case 'headteacher':
      return 'Headteacher';
    case 'bursar':
      return 'Bursar / Accountant';
    case 'teacher':
      return 'Teacher';
    case 'parent':
      return 'Parent';
    default:
      return role || '—';
  }
}

export const PASSWORD_SPECIAL = /[@$!%*?&]/;

export function passwordRequirementMessages(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('At least 8 characters');
  if (password.length > 100) issues.push('No more than 100 characters');
  if (!/[A-Z]/.test(password)) issues.push('One uppercase letter');
  if (!/[a-z]/.test(password)) issues.push('One lowercase letter');
  if (!/\d/.test(password)) issues.push('One number');
  if (!PASSWORD_SPECIAL.test(password)) issues.push('One special character (@$!%*?&)');
  return issues;
}

export function isStrongPassword(password: string) {
  return passwordRequirementMessages(password).length === 0;
}
