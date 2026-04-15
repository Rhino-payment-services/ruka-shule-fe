'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { schoolsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isSchoolAdmin = user?.role === 'school_admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
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
    const loadSchool = async () => {
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
        toast.error(error?.response?.data?.error || 'Failed to load school settings');
      } finally {
        setLoading(false);
      }
    };
    loadSchool();
  }, [isSchoolAdmin]);

  const handleSave = async () => {
    try {
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
      if (formData.settlement_min_threshold.trim() !== '') {
        payload.settlement_min_threshold = Number(formData.settlement_min_threshold);
      }

      await schoolsAPI.updateMySchool(payload);
      toast.success('School settings updated');

      const refreshed = await schoolsAPI.getMySchool();
      setSchool(refreshed.data?.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'school_admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="mt-2 text-muted-foreground">Manage school profile and settlement configuration</p>
          </div>

          {!isSchoolAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Admin settings panel can be extended here.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Settings className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No editable school profile for admin role.</p>
              </CardContent>
            </Card>
          )}

          {isSchoolAdmin && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Current School Profile</CardTitle>
                  <CardDescription>Review current values before editing.</CardDescription>
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
                  <CardDescription>Update missing or incorrect payout details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={formData.address} onChange={(e) => setFormData((s) => ({ ...s, address: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
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
                      <Input value={formData.bank_code} onChange={(e) => setFormData((s) => ({ ...s, bank_code: e.target.value }))} placeholder="e.g. 040147" />
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
                    <Button onClick={handleSave} disabled={saving || loading}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Settings'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
