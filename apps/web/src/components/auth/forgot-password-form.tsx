'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, KeyRound, LockKeyhole, MailCheck, ShieldCheck, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { reportFieldError } from '@/components/ui/form-validation';
import { getApiErrorMessage } from '@/lib/api-error';
import { confirmPasswordReset, requestPasswordReset, verifyPasswordReset } from '@/lib/auth-api';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { Field } from './form-fields';
import { PasswordField } from './password-field';

const RESEND_COOLDOWN_SECONDS = 120;

export function ForgotPasswordForm() {
  const router = useRouter();
  const showToast = useToast();
  const [login, setLogin] = useState('');
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);
  const [sentToEmail, setSentToEmail] = useState('');
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  async function sendCode(target: string): Promise<boolean> {
    try {
      const { sentTo } = await requestPasswordReset(target);
      setCodeSentTo(target);
      setSentToEmail(sentTo);
      setVerifiedCode(null);
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
    await sendCode(login.trim());
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

  async function handleVerify(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!codeSentTo) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim();

    setSubmitting(true);
    try {
      await verifyPasswordReset({ login: codeSentTo, code });
      setVerifiedCode(code);
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'kiểm tra mã xác nhận') });
    }
    setSubmitting(false);
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!codeSentTo || !verifiedCode) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('newPassword') ?? '');
    if (newPassword !== String(form.get('confirmPassword') ?? '')) {
      const confirmField = event.currentTarget.elements.namedItem('confirmPassword');
      if (confirmField instanceof HTMLInputElement) {
        reportFieldError(confirmField, 'Mật khẩu nhập lại không khớp.');
      }
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({ login: codeSentTo, code: verifiedCode, newPassword });
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
          id="reset-login"
          name="login"
          label="Tên đăng nhập hoặc email"
          icon={<UserRound />}
          autoComplete="username"
          minLength={3}
          maxLength={191}
          value={login}
          onChange={(event) => setLogin(event.target.value)}
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

  if (!verifiedCode) {
    return (
      <form className="grid gap-4" onSubmit={handleVerify}>
        <p className="flex gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 text-sm leading-6 text-brand-900">
          <MailCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Mã xác nhận đã gửi đến email <strong className="font-semibold">{sentToEmail}</strong>.
            Vui lòng nhập mã xác nhận. Mã có hiệu lực trong 10 phút.
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
          title="Mã xác nhận gồm 6 chữ số."
          maxLength={6}
          placeholder="123456"
          autoFocus
          required
        />
        <Button type="submit" size="lg" className="mt-1" disabled={submitting}>
          {submitting ? (
            'Đang kiểm tra…'
          ) : (
            <>
              Xác nhận mã
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          )}
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
            Đổi tên đăng nhập hoặc email
          </button>
        </div>
        <BackToLogin />
      </form>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={handleConfirm}>
      <p className="flex gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 text-sm leading-6 text-brand-900">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Mã xác nhận hợp lệ. Hãy đặt mật khẩu mới cho tài khoản{' '}
          <strong className="font-semibold">{codeSentTo}</strong>.
        </span>
      </p>
      <PasswordField
        id="reset-new-password"
        name="newPassword"
        label="Mật khẩu mới"
        icon={<LockKeyhole />}
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
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
