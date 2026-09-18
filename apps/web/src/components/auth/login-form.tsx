'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { getApiErrorMessage } from '@/lib/api-error';
import { login, profileDestination } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Field } from './form-fields';

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // Surfaces the reason a guard bounced the visitor back to the login page.
  useEffect(() => {
    if (initialError) showToast({ kind: 'error', message: initialError });
  }, [initialError, showToast]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const profile = await login({
        username: String(form.get('username') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      router.replace(profileDestination(profile));
      router.refresh();
    } catch (submissionError: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(submissionError, 'đăng nhập'),
      });
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field
        id="username"
        name="username"
        label="Tên đăng nhập"
        autoComplete="username"
        minLength={3}
        maxLength={191}
        required
      />
      <Field
        id="password"
        name="password"
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        minLength={1}
        required
      />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
