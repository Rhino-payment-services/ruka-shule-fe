'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthBrandHeader, AuthSplitLayout } from '@/components/landing/AuthSplitLayout';
import { authAPI } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api/errors';
import { isStrongPassword, passwordRequirementMessages, roleLabel } from '@/lib/permissions';
import type { InvitationPreview } from '@/lib/api/types';

export default function SetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token') || '';
    setToken(t);
    if (!t) {
      setError('Invitation link is missing or invalid.');
      setLoading(false);
      return;
    }
    authAPI
      .verifyInvitation(t)
      .then((res) => setPreview(res.data.data))
      .catch((err: unknown) => setError(getApiErrorMessage(err, 'Invitation link is invalid or expired.')))
      .finally(() => setLoading(false));
  }, []);

  const issues = passwordRequirementMessages(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('New password and confirmation do not match');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password does not meet security requirements');
      return;
    }
    setSaving(true);
    try {
      await authAPI.setPassword({ token, new_password: password, confirm_password: confirm });
      router.replace(`/login?email=${encodeURIComponent(preview?.email || '')}`);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Could not set password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthSplitLayout loading={loading}>
      <AuthBrandHeader
        title="Set your password"
        subtitle={
          preview
            ? `Activate your ${roleLabel(preview.role)} access${preview.school ? ` for ${preview.school}` : ''}`
            : 'Complete your Ruka Shule invitation'
        }
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {preview && (
          <p className="text-sm text-slate-500">
            Account: <span className="font-medium text-[#08163d]">{preview.email}</span>
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl border-slate-200 pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="h-11 rounded-xl border-slate-200"
          />
        </div>
        {password ? (
          <ul className="space-y-1 text-xs text-slate-500">
            {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character (@$!%*?&)'].map(
              (rule) => {
                const ok =
                  (rule.startsWith('At least') && !issues.some((i) => i.includes('8'))) ||
                  (rule.includes('uppercase') && !issues.some((i) => i.includes('uppercase'))) ||
                  (rule.includes('lowercase') && !issues.some((i) => i.includes('lowercase'))) ||
                  (rule.includes('number') && !issues.some((i) => i.includes('number'))) ||
                  (rule.includes('special') && !issues.some((i) => i.includes('special')));
                return (
                  <li key={rule} className={ok ? 'text-emerald-600' : 'text-slate-400'}>
                    {ok ? '●' : '○'} {rule}
                  </li>
                );
              },
            )}
          </ul>
        ) : null}
        <Button
          type="submit"
          disabled={saving || !preview}
          className="h-11 w-full rounded-full bg-[#08163d] text-white hover:bg-[#08163d]/90"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Activate account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Already activated?{' '}
        <Link href="/login" className="font-semibold text-[#08163d] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
