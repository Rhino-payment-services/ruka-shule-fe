'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authAPI, schoolsAPI } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ButtonSpinner, LoadingState } from '@/components/LoadingState';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { PanelShell, StatusPill, toneFromStatus } from '@/components/data-table';
import { hasPermission, isStrongPassword, passwordRequirementMessages, PERMISSIONS, roleLabel } from '@/lib/permissions';
import { firstAccessiblePath } from '@/lib/app-home';
import { getApiErrorMessage } from '@/lib/api/errors';

interface SchoolProfile {
  name: string;
  code: string;
  address?: string;
  phone: string;
  email: string;
  bank_name?: string;
  bank_code?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_branch?: string;
  settlement_frequency?: string;
  settlement_min_threshold?: number;
  auto_settlement_enabled?: boolean;
  merchant_status?: string;
  merchant_rejection_reason?: string;
  merchant_status_note?: string;
}

interface AdminProfile {
  id: string;
  email: string;
  phone: string;
  role: string;
  first_name?: string;
  last_name?: string;
  school_id?: string;
  created_at?: string;
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const canReadSettings = user?.role === 'admin' || hasPermission(user, PERMISSIONS.settingsRead);
  const canWriteSettings = hasPermission(user, PERMISSIONS.settingsWrite);
  const canChangePassword =
    user?.role === 'admin' || hasPermission(user, PERMISSIONS.authChangePassword);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [schoolSetupRequired, setSchoolSetupRequired] = useState(false);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [formData, setFormData] = useState({
    address: '',
    phone: '',
    email: '',
    bank_name: '',
    bank_code: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_branch: '',
    settlement_frequency: 'manual',
    settlement_min_threshold: '',
    auto_settlement_enabled: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({ current: false, next: false, confirm: false });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const meRes = await authAPI.me();
        setAdminProfile(meRes.data?.data as AdminProfile);
      } catch (error: unknown) {
        if (user) {
          setAdminProfile({
            id: user.id,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            school_id: user.school_id,
          });
        } else {
          toast.error(getApiErrorMessage(error, 'Failed to load account'));
        }
      }

      if (!canReadSettings || user?.role === 'admin') {
        setLoading(false);
        return;
      }

      try {
        const res = await schoolsAPI.getMySchool();
        const data = res.data?.data as SchoolProfile;
        setSchool(data);
        setFormData({
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          bank_name: data.bank_name || '',
          bank_code: data.bank_code || '',
          bank_account_name: data.bank_account_name || '',
          bank_account_number: data.bank_account_number || '',
          bank_branch: data.bank_branch || '',
          settlement_frequency: data.settlement_frequency || 'manual',
          settlement_min_threshold:
            data.settlement_min_threshold !== undefined && data.settlement_min_threshold !== null
              ? String(data.settlement_min_threshold)
              : '',
          auto_settlement_enabled: !!data.auto_settlement_enabled,
        });
      } catch (error: unknown) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setSchoolSetupRequired(true);
        } else {
          toast.error(getApiErrorMessage(error, 'Failed to load school settings'));
        }
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [canReadSettings, user]);

  const handleSave = async () => {
    if (schoolSetupRequired) {
      toast.error('Complete school onboarding before updating settings');
      return;
    }
    try {
      const thresholdValue =
        formData.settlement_min_threshold.trim() === ''
          ? undefined
          : Number(formData.settlement_min_threshold);

      if (!['manual', 'daily', 'weekly'].includes(formData.settlement_frequency)) {
        toast.error('Settlement frequency must be manual, daily, or weekly');
        return;
      }

      if (
        thresholdValue !== undefined &&
        (!Number.isFinite(thresholdValue) || thresholdValue < 0)
      ) {
        toast.error('Settlement minimum threshold must be zero or greater');
        return;
      }

      setSaving(true);
      const payload: Record<string, unknown> = {
        address: formData.address || null,
        phone: formData.phone,
        email: formData.email,
        bank_name: formData.bank_name || null,
        bank_code: formData.bank_code || null,
        account_name: formData.bank_account_name || null,
        account_number: formData.bank_account_number || null,
        branch: formData.bank_branch || null,
        settlement_frequency: formData.settlement_frequency || 'manual',
        auto_settlement_enabled: formData.auto_settlement_enabled,
      };
      if (thresholdValue !== undefined) {
        payload.settlement_min_threshold = thresholdValue;
      }

      await schoolsAPI.updateMySchool(payload);
      toast.success('School settings updated');
      setSaveConfirmOpen(false);

      const refreshed = await schoolsAPI.getMySchool();
      setSchool(refreshed.data?.data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to save settings'));
    } finally {
      setSaving(false);
    }
  };

  const openSaveConfirm = () => {
    if (schoolSetupRequired) {
      toast.error('Complete school onboarding before updating settings');
      return;
    }
    if (!['manual', 'daily', 'weekly'].includes(formData.settlement_frequency)) {
      toast.error('Settlement frequency must be manual, daily, or weekly');
      return;
    }
    const thresholdValue =
      formData.settlement_min_threshold.trim() === ''
        ? undefined
        : Number(formData.settlement_min_threshold);
    if (
      thresholdValue !== undefined &&
      (!Number.isFinite(thresholdValue) || thresholdValue < 0)
    ) {
      toast.error('Settlement minimum threshold must be zero or greater');
      return;
    }
    setSaveConfirmOpen(true);
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('New password and confirmation do not match');
      return;
    }
    if (!isStrongPassword(passwordForm.new_password)) {
      toast.error('Password does not meet security requirements');
      return;
    }
    if (passwordForm.new_password === passwordForm.current_password) {
      toast.error('New password must be different from the current password');
      return;
    }
    try {
      setSavingPassword(true);
      await authAPI.changePassword(passwordForm);
      toast.success('Password updated. Please sign in again.');
      await logout();
      router.replace('/login');
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Failed to change password'));
    } finally {
      setSavingPassword(false);
    }
  };

  const passwordIssues = passwordRequirementMessages(passwordForm.new_password);

  return (
    <ProtectedRoute
      allowedRoles={['admin']}
      requiredPermission={[PERMISSIONS.settingsRead, PERMISSIONS.authChangePassword]}
    >
      <DashboardLayout>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            {user?.role === 'admin'
              ? 'Manage your platform admin account'
              : 'Manage your account, school profile, and settlement configuration'}
          </p>

          <PanelShell title="Account" description="Your login account for this dashboard">
            {loading && !adminProfile ? (
              <LoadingState label="Loading account…" className="py-6" size="sm" />
            ) : (
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <p>
                  <span className="text-slate-500">Name:</span>{' '}
                  <span className="text-[#08163d]">
                    {[adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(' ') || '—'}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Role:</span>
                  <StatusPill tone="info">{roleLabel(adminProfile?.role || user?.role)}</StatusPill>
                </div>
                <p>
                  <span className="text-slate-500">Email:</span>{' '}
                  <span className="text-[#08163d]">{adminProfile?.email || user?.email || '—'}</span>
                </p>
                <p>
                  <span className="text-slate-500">Phone:</span>{' '}
                  <span className="text-[#08163d]">{adminProfile?.phone || user?.phone || '—'}</span>
                </p>
              </div>
            )}
          </PanelShell>

          {canChangePassword && (
            <PanelShell title="Change password" description="Your new password takes effect on the next login">
              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    ['current_password', 'Current password', 'current'],
                    ['new_password', 'New password', 'next'],
                    ['confirm_password', 'Confirm new password', 'confirm'],
                  ] as const
                ).map(([field, label, vis]) => (
                  <div key={field} className="space-y-2">
                    <Label className="text-xs font-medium text-slate-500">{label}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword[vis] ? 'text' : 'password'}
                        value={passwordForm[field]}
                        onChange={(e) =>
                          setPasswordForm((s) => ({ ...s, [field]: e.target.value }))
                        }
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                        onClick={() => setShowPassword((s) => ({ ...s, [vis]: !s[vis] }))}
                      >
                        {showPassword[vis] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {passwordForm.new_password ? (
                <ul className="mt-3 space-y-1 text-xs">
                  {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character (@$!%*?&)'].map(
                    (rule) => {
                      const unmet = passwordIssues.some((issue) => issue.toLowerCase().includes(rule.split(' ')[1]?.toLowerCase() || rule.toLowerCase())) ||
                        (rule.startsWith('At least') && passwordIssues.some((i) => i.includes('8'))) ||
                        (rule.startsWith('One uppercase') && passwordIssues.some((i) => i.includes('uppercase'))) ||
                        (rule.startsWith('One lowercase') && passwordIssues.some((i) => i.includes('lowercase'))) ||
                        (rule.startsWith('One number') && passwordIssues.some((i) => i.includes('number'))) ||
                        (rule.startsWith('One special') && passwordIssues.some((i) => i.includes('special')));
                      return (
                        <li key={rule} className={unmet ? 'text-slate-400' : 'text-emerald-600'}>
                          {unmet ? '○' : '●'} {rule}
                        </li>
                      );
                    },
                  )}
                </ul>
              ) : null}
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                >
                  {savingPassword ? <><ButtonSpinner /> Updating…</> : 'Update password'}
                </Button>
              </div>
            </PanelShell>
          )}

          {user?.role === 'admin' && (
            <PanelShell title="Platform settings" description="School profile editing is only available to school admins">
              <p className="text-sm text-slate-500">
                Use Schools and Pending Approvals to manage school onboarding.
              </p>
            </PanelShell>
          )}

          {canReadSettings && user?.role !== 'admin' && schoolSetupRequired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <h2 className="text-sm font-semibold text-amber-900">School setup required</h2>
              <p className="mt-1 text-xs text-amber-800">
                This account is active, but no school is linked yet. Complete school onboarding before editing settings.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={() => router.push('/dashboard/schools/onboard')} className="h-9 rounded-full bg-amber-600 text-white hover:bg-amber-700">
                  Onboard School
                </Button>
                <Button variant="outline" className="h-9 rounded-full" onClick={() => router.push(firstAccessiblePath(user))}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {canReadSettings && user?.role !== 'admin' && !schoolSetupRequired && (
            <>
              {school?.merchant_status === 'rejected' && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                  <h2 className="text-sm font-semibold text-red-900">Merchant onboarding rejected</h2>
                  <p className="mt-1 text-xs text-red-800">{school.merchant_rejection_reason || 'No reason provided'}</p>
                </div>
              )}
              <PanelShell title="School profile" description="School contact details and merchant status">
                {loading ? (
                  <LoadingState label="Loading profile…" className="py-6" size="sm" />
                ) : (
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <p><span className="text-slate-500">School:</span> <span className="text-[#08163d]">{school?.name || '—'} ({school?.code || '—'})</span></p>
                    <p><span className="text-slate-500">Phone:</span> <span className="text-[#08163d]">{school?.phone || '—'}</span></p>
                    <p><span className="text-slate-500">Email:</span> <span className="text-[#08163d]">{school?.email || '—'}</span></p>
                    <p><span className="text-slate-500">Address:</span> <span className="text-[#08163d]">{school?.address || '—'}</span></p>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Merchant status:</span>
                      <StatusPill tone={toneFromStatus(school?.merchant_status)} dot>
                        {school?.merchant_status?.replace(/_/g, ' ') || '—'}
                      </StatusPill>
                    </div>
                    <p><span className="text-slate-500">Bank:</span> <span className="text-[#08163d]">{school?.bank_name || '—'}</span></p>
                    <p><span className="text-slate-500">Account:</span> <span className="text-[#08163d]">{school?.bank_account_name || '—'}</span></p>
                    <p><span className="text-slate-500">Account number:</span> <span className="text-[#08163d]">{school?.bank_account_number || '—'}</span></p>
                  </div>
                )}
              </PanelShell>

              {canWriteSettings && (
                <PanelShell title="Edit school & settlement" description="Update payment phone, bank details, and settlement configuration">
                  <div className="grid gap-4 md:grid-cols-2">
                    {(
                      [
                        ['address', 'Address'],
                        ['phone', 'Payment phone'],
                        ['email', 'Email'],
                        ['bank_name', 'Bank name'],
                        ['bank_code', 'Bank code / sort code'],
                        ['bank_account_name', 'Bank account name'],
                        ['bank_account_number', 'Bank account number'],
                        ['bank_branch', 'Bank branch'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-2">
                        <Label className="text-xs font-medium text-slate-500">{label}</Label>
                        <Input
                          value={formData[key]}
                          onChange={(e) => setFormData((s) => ({ ...s, [key]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Settlement frequency</Label>
                      <Select
                        value={formData.settlement_frequency}
                        onValueChange={(value) => setFormData((s) => ({ ...s, settlement_frequency: value }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">manual</SelectItem>
                          <SelectItem value="daily">daily</SelectItem>
                          <SelectItem value="weekly">weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Settlement min threshold (UGX)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.settlement_min_threshold}
                        onChange={(e) => setFormData((s) => ({ ...s, settlement_min_threshold: e.target.value }))}
                      />
                    </div>
                  </div>
                  <label className="mt-4 flex items-center gap-2 text-sm text-[#08163d]">
                    <input
                      type="checkbox"
                      checked={formData.auto_settlement_enabled}
                      onChange={(e) => setFormData((s) => ({ ...s, auto_settlement_enabled: e.target.checked }))}
                    />
                    Enable auto settlement
                  </label>
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={openSaveConfirm}
                      disabled={saving || loading}
                      className="h-9 rounded-full bg-[#08163d] px-4 text-white hover:bg-[#0a1f4f]"
                    >
                      {saving ? <><ButtonSpinner /> Saving…</> : 'Save settings'}
                    </Button>
                  </div>
                </PanelShell>
              )}
            </>
          )}

          <ConfirmDialog
            open={saveConfirmOpen}
            onOpenChange={setSaveConfirmOpen}
            description="Are you sure you want to save these school settings? Incorrect bank details can delay payouts."
            confirmLabel="Save settings"
            loading={saving}
            onConfirm={handleSave}
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
