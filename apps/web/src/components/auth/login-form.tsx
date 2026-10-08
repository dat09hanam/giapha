'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';

import { getApiErrorMessage } from '@/lib/api-error';
import { FORGOT_PASSWORD_PATH, login, profileDestination } from '@/lib/auth-api';
import { changePasswordHref } from '@/lib/login-redirect';
import { safeReturnPath } from '@/lib/return-path';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Field } from './form-fields';
import { PasswordField } from './password-field';

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
      // A page the visitor was sent here from; anything else lands on the account's usual page.
      const next = safeReturnPath(
        profile,
        new URLSearchParams(window.location.search).get('next'),
      );
      router.replace(
        profile.mustChangePassword && next
          ? changePasswordHref(next)
          : (next ?? profileDestination(profile)),
      );
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
        icon={<UserRound />}
        autoComplete="username"
        minLength={3}
        maxLength={191}
        required
      />
      <PasswordField
        id="password"
        name="password"
        label="Mật khẩu"
        icon={<LockKeyhole />}
        autoComplete="current-password"
        minLength={1}
        required
      />
      <Link
        href={FORGOT_PASSWORD_PATH}
        className="-mt-1 justify-self-end text-sm font-medium text-brand-800 underline-offset-4 hover:underline"
      >
        Quên mật khẩu?
      </Link>
      <Button type="submit" size="lg" className="mt-1" disabled={submitting}>
        {submitting ? (
          'Đang đăng nhập…'
        ) : (
          <>
            Đăng nhập
            <ArrowRight className="size-4" aria-hidden="true" />
          </>
        )}
      </Button>
    </form>
  );
}
