'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { getApiErrorMessage } from '@/lib/api-error';
import { login, profileDestination, type AuthProfile } from '@/lib/auth-api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Field } from './form-fields';

/**
 * The page the visitor was on before being sent to sign in (`?next=`), when it
 * is a path on this site that the account just signed in may open: its own
 * family's pages, or /admin for the platform admin. Anything else, including
 * links to other sites, falls back to the account's usual landing page.
 */
function returnPath(profile: AuthProfile): string | null {
  const next = new URLSearchParams(window.location.search).get('next');
  // "//host" and "/\host" both leave the site in a browser.
  if (!next || !/^\/(?![/\\])/.test(next) || next.startsWith('/login')) return null;
  const [, first = '', second = ''] = next.split(/[/?#]/);
  if (profile.role === 'ADMIN') return first === 'admin' ? next : null;
  const slug = profile.family?.slug;
  if (!slug) return null;
  try {
    const ownFamily =
      decodeURIComponent(first) === slug ||
      (first === 'admin' && decodeURIComponent(second) === slug);
    return ownFamily ? next : null;
  } catch {
    return null;
  }
}

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
      router.replace(returnPath(profile) ?? profileDestination(profile));
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
