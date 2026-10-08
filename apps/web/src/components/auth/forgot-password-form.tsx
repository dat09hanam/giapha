'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, LockKeyhole, MailCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { confirmPasswordReset, requestPasswordReset } from '@/lib/auth-api';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { Field } from './form-fields';
import { PasswordField } from './password-field';

/** Matches the API's cooldown between two codes for one account. */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Quên mật khẩu in two steps: the username asks for a code mailed to the account's email, then the
 * code and a new password replace the forgotten one.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const showToast = useToast();
  const [username, setUsername] = useState('');
  /** Set once a code was requested; the form then asks for it. */
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(target: string): Promise<boolean> {
    try {
      await requestPasswordReset(target);
      setCodeSentTo(target);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      return true;
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'gửi mã xác nhận') });
      return false;
    }
  }

  async function handleRequest(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    await sendCode(username.trim());
    setSubmitting(false);
  }

  async function handleResend(): Promise<void> {
    if (!codeSentTo || resendIn > 0) return;
    setSubmitting(true);
    if (await sendCode(codeSentTo)) {
      showToast({ kind: 'success', message: 'Đã gửi lại mã xác nhận.' });
    }
    setSubmitting(false);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!codeSentTo) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    if (newPassword !== String(form.get('confirmPassword') ?? '')) {
      showToast({ kind: 'error', message: 'Mật khẩu nhập lại không khớp.' });
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({
        username: codeSentTo,
        code: String(form.get('code') ?? '').trim(),
        newPassword,
      });
      showToast({
        kind: 'success',
        message: 'Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.',
      });
      router.replace('/login');
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đặt lại mật khẩu') });
      setSubmitting(false);
    }
  }

  if (!codeSentTo) {
    return (
      <form className="grid gap-4" onSubmit={handleRequest}>
        <Field
          id="reset-username"
          name="username"
          label="Tên đăng nhập"
          icon={<UserRound />}
          autoComplete="username"
          minLength={3}
          maxLength={191}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          hint="Mã xác nhận sẽ được gửi tới email đã đăng ký cho tài khoản này."
          required
        />
        <Button type="submit" size="lg" className="mt-1" disabled={submitting}>
          {submitting ? (
            'Đang gửi…'
          ) : (
            <>
              Gửi mã xác nhận
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
        </Button>
        <BackToLogin />
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleConfirm}>
      <p className="flex gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 text-sm leading-6 text-brand-900">
        <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Nếu tài khoản <strong className="font-semibold">{codeSentTo}</strong> có email đã đăng
          ký, mã gồm 6 chữ số vừa được gửi tới email đó. Mã có hiệu lực trong 10 phút.
        </span>
      </p>
      <Field
        id="reset-code"
        name="code"
        label="Mã xác nhận"
        icon={<KeyRound />}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="123456"
        required
      />
      <PasswordField
        id="reset-new-password"
        name="newPassword"
        label="Mật khẩu mới"
        icon={<LockKeyhole />}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        hint={`Tối thiểu ${MIN_PASSWORD_LENGTH} ký tự.`}
        required
      />
      <PasswordField
        id="reset-confirm-password"
        name="confirmPassword"
        label="Nhập lại mật khẩu mới"
        icon={<LockKeyhole />}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        required
      />
      <Button type="submit" size="lg" className="mt-1" disabled={submitting}>
        {submitting ? 'Đang lưu…' : 'Đặt lại mật khẩu'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          className="font-medium text-brand-800 underline-offset-4 hover:underline disabled:text-stone-400 disabled:no-underline"
          disabled={submitting || resendIn > 0}
          onClick={handleResend}
        >
          {resendIn > 0 ? `Gửi lại mã sau ${resendIn} giây` : 'Gửi lại mã'}
        </button>
        <button
          type="button"
          className="text-stone-600 underline-offset-4 hover:underline"
          onClick={() => {
            setCodeSentTo(null);
            setResendIn(0);
          }}
        >
          Đổi tên đăng nhập
        </button>
      </div>
      <BackToLogin />
    </form>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="justify-self-center text-sm font-medium text-brand-800 underline-offset-4 hover:underline"
    >
      Quay lại đăng nhập
    </Link>
  );
}
