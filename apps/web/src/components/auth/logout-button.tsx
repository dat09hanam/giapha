'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function logout(): Promise<void> {
    setSubmitting(true);
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <Button type="button" variant="outline" onClick={logout} disabled={submitting}>
      <LogOut className="size-4" aria-hidden="true" />
      {submitting ? 'Đang đăng xuất…' : 'Đăng xuất'}
    </Button>
  );
}
