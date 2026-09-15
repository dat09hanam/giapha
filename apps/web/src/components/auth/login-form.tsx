'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { login, profileDestination } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { Field, FormError } from './form-fields';

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const profile = await login({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });
      const safeNextPath = nextPath && /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nextPath) ? nextPath : null;
      router.push(safeNextPath ?? profileDestination(profile));
      router.refresh();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Không thể đăng nhập');
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field id="email" name="email" label="Email" type="email" autoComplete="email" required />
      <Field
        id="password"
        name="password"
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        minLength={1}
        required
      />
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
