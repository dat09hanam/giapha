'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react';

import { getApiErrorMessage } from '@/lib/api-error';
import {
  FORGOT_PASSWORD_PATH,
  GOOGLE_CLIENT_ID,
  GOOGLE_SIGNUP_PATH,
  login,
  loginWithGoogle,
  profileDestination,
  type AuthProfile,
} from '@/lib/auth-api';
import { savePendingGoogleSignup } from '@/lib/google-signup';
import { changePasswordHref } from '@/lib/login-redirect';
import { safeReturnPath } from '@/lib/return-path';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Field } from './form-fields';
import { GoogleSignInButton } from './google-sign-in-button';
import { PasswordField } from './password-field';

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const router = useRouter();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialError) showToast({ kind: 'error', message: initialError });
  }, [initialError, showToast]);

  function goOn(profile: AuthProfile): void {
    const next = safeReturnPath(profile, new URLSearchParams(window.location.search).get('next'));
    router.replace(
      profile.mustChangePassword && next
        ? changePasswordHref(next)
        : (next ?? profileDestination(profile)),
    );
    router.refresh();
  }

  async function handleGoogle(credential: string): Promise<void> {
    setSubmitting(true);
    try {
      const result = await loginWithGoogle(credential);
      if (result.status === 'signed-in') {
        goOn(result.profile);
        return;
      }
      // No account yet: the sign-up page picks up this Google sign-in and asks for the family.
      savePendingGoogleSignup({ credential, email: result.email, name: result.name });
      router.push(GOOGLE_SIGNUP_PATH);
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đăng nhập bằng Google') });
      setSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      goOn(
        await login({
          username: String(form.get('username') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      );
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
        label="Tên đăng nhập hoặc email"
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
      {GOOGLE_CLIENT_ID ? (
        <>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-stone-400">
            <span className="h-px flex-1 bg-gold-500/30" />
            hoặc
            <span className="h-px flex-1 bg-gold-500/30" />
          </div>
          <GoogleSignInButton
            text="signin_with"
            disabled={submitting}
            onCredential={(credential) => void handleGoogle(credential)}
          />
          <p className="text-center text-sm text-stone-600">
            Chưa có gia phả?{' '}
            <Link
              href={GOOGLE_SIGNUP_PATH}
              className="font-medium text-brand-800 underline-offset-4 hover:underline"
            >
              Đăng ký miễn phí
            </Link>
          </p>
        </>
      ) : null}
    </form>
  );
}
