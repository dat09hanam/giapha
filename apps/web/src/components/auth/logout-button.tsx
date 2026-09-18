'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { logout as requestLogout } from '@/lib/auth-api';

export function LogoutButton() {
  const router = useRouter();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function logout(): Promise<void> {
    setSubmitting(true);

    try {
      await requestLogout();
      router.replace('/login');
      router.refresh();
    } catch (logoutError: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(logoutError, 'đăng xuất'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={logout} disabled={submitting}>
      <LogOut className="size-4" aria-hidden="true" />
      {submitting ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  );
}
