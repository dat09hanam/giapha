'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormError } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { logout as requestLogout } from '@/lib/auth-api';

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logout(): Promise<void> {
    setSubmitting(true);
    setError(null);

    try {
      await requestLogout();
      router.replace('/login');
      router.refresh();
    } catch (logoutError: unknown) {
      setError(getApiErrorMessage(logoutError, 'đăng xuất'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" onClick={logout} disabled={submitting}>
        <LogOut className="size-4" aria-hidden="true" />
        {submitting ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </Button>
      <FormError message={error} />
    </div>
  );
}
