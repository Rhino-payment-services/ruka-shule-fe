'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Loader2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authAPI, schoolsAPI } from '@/lib/api';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

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

function roleLabel(role?: string) {
  if (role === 'school_admin') return 'School Admin';
  if (role === 'admin') return 'Platform Admin';
  return role || '—';
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isSchoolAdmin = user?.role === 'school_admin';

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

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const meRes = await authAPI.me();
        setAdminProfile(meRes.data?.data as AdminProfile);
      } catch (error: any) {
        // Fall back to JWT user so the account card still renders if /auth/me is unavailable.
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
          toast.error(error?.response?.data?.error || 'Failed to load account');
        }
      }

      if (!isSchoolAdmin) {
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
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setSchoolSetupRequired(true);
        } else {
          toast.error(error?.response?.data?.error || 'Failed to load school settings');
        }
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, [isSchoolAdmin, user]);

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
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save settings');
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

  return (
    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              {isSchoolAdmin
                ? 'Manage your account, school profile, and settlement configuration'
                : 'Manage your platform admin account'}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                {isSchoolAdmin ? 'School Admin Account' : 'Admin Account'}
              </CardTitle>
              <CardDescription>
                {isSchoolAdmin
                  ? 'Your login account for managing this school'
                  : 'Your platform admin login account'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              {loading && !adminProfile ? (
                <p className="text-muted-foreground">Loading account...</p>
              ) : (
                <>
                  <p>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    {[adminProfile?.first_name, adminProfile?.last_name].filter(Boolean).join(' ') || '—'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Role:</span>
                    <Badge variant="outline">{roleLabel(adminProfile?.role || user?.role)}</Badge>
                  </div>
                  <p>
                    <span className="text-muted-foreground">Email:</span> {adminProfile?.email || user?.email || '—'}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Phone:</span> {adminProfile?.phone || user?.phone || '—'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {!isSchoolAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>School profile editing is only available to school admins.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground text-center">
                  Use Schools and Pending Approvals to manage school onboarding.
                </p>
              </CardContent>
            </Card>
          )}

          {isSchoolAdmin && schoolSetupRequired && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">School setup required</CardTitle>
                <CardDescription className="text-amber-800">
                  This account is active, but no school is linked yet. Complete school onboarding before editing settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button onClick={() => router.push('/dashboard/schools/onboard')} className="bg-amber-600 hover:bg-amber-700 text-white">
                  Onboard School
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard
                </Button>
              </CardContent>
            </Card>
          )}

          {isSchoolAdmin && !schoolSetupRequired && (
            <>
              {school?.merchant_status === 'rejected' && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="text-red-900">Merchant Onboarding Rejected</CardTitle>
                    <CardDescription className="text-red-800">Your school's merchant onboarding was rejected. Transactions are disabled until this is resolved.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-900 font-medium">Reason:</p>
                    <p className="text-sm text-red-800">{(school as any).merchant_rejection_reason || 'No reason provided'}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>School Profile</CardTitle>
                  <CardDescription>School contact details and merchant status.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm md:grid-cols-2">
                  {loading ? (
                    <p className="text-muted-foreground">Loading profile...</p>
                  ) : (
                    <>
                      <p><span className="text-muted-foreground">School:</span> {school?.name || '—'} ({school?.code || '—'})</p>
                      <p><span className="text-muted-foreground">Phone:</span> {school?.phone || '—'}</p>
                      <p><span className="text-muted-foreground">Email:</span> {school?.email || '—'}</p>
                      <p><span className="text-muted-foreground">Address:</span> {school?.address || '—'}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Merchant Status:</span>
                        {school?.merchant_status ? (
                          <>
                            <Badge
                              variant="outline"
                              className={
                                school.merchant_status === 'approved'
                                  ? 'bg-green-100 text-green-700 border-green-300'
                                  : school.merchant_status === 'rejected'
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : 'bg-amber-100 text-amber-700 border-amber-300'
                              }
                            >
                              {school.merchant_status === 'pending_onboarding'
                                ? 'Pending Onboarding'
                                : school.merchant_status === 'kyc_submitted'
                                ? 'KYC Submitted'
                                : school.merchant_status === 'approved'
                                ? 'Approved'
                                : school.merchant_status === 'rejected'
                                ? 'Rejected'
                                : school.merchant_status}
                            </Badge>
                            {school.merchant_status_note && (
                              <p className="text-sm text-muted-foreground">Note: {school.merchant_status_note}</p>
                            )}
                          </>
                        ) : (
                          <Badge variant="outline">Unknown</Badge>
                        )}
                      </div>
                      <p><span className="text-muted-foreground">Bank:</span> {school?.bank_name || '—'}</p>
                      <p><span className="text-muted-foreground">Bank Code:</span> {school?.bank_code || '—'}</p>
                      <p><span className="text-muted-foreground">Account Name:</span> {school?.bank_account_name || '—'}</p>
                      <p><span className="text-muted-foreground">Account Number:</span> {school?.bank_account_number || '—'}</p>
                      <p><span className="text-muted-foreground">Branch:</span> {school?.bank_branch || '—'}</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Edit School & Settlement Settings</CardTitle>
                    <CardDescription>Update the school payment phone, contact details, and settlement configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={formData.address} onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Phone</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData((s) => ({ ...s, phone: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={formData.email} onChange={(e) => setFormData((s) => ({ ...s, email: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Input value={formData.bank_name} onChange={(e) => setFormData((s) => ({ ...s, bank_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Code / Sort Code</Label>
                      <Input value={formData.bank_code} onChange={(e) => setFormData((s) => ({ ...s, bank_code: e.target.value }))} placeholder="e.g. 040147" required />
                      <p className="text-xs text-muted-foreground">Required for school bank settlements.</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Account Name</Label>
                      <Input value={formData.bank_account_name} onChange={(e) => setFormData((s) => ({ ...s, bank_account_name: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Account Number</Label>
                      <Input value={formData.bank_account_number} onChange={(e) => setFormData((s) => ({ ...s, bank_account_number: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Branch</Label>
                      <Input value={formData.bank_branch} onChange={(e) => setFormData((s) => ({ ...s, bank_branch: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Settlement Frequency</Label>
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
                      <Label>Settlement Min Threshold (UGX)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={formData.settlement_min_threshold}
                        onChange={(e) => setFormData((s) => ({ ...s, settlement_min_threshold: e.target.value }))}
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.auto_settlement_enabled}
                      onChange={(e) => setFormData((s) => ({ ...s, auto_settlement_enabled: e.target.checked }))}
                    />
                    Enable auto settlement
                  </label>

                  <div className="flex justify-end">
                    <Button onClick={openSaveConfirm} disabled={saving || loading}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
