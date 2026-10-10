'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { reportFieldError } from '@/components/ui/form-validation';
import { getApiErrorMessage } from '@/lib/api-error';
import { changePassword, profileDestination } from '@/lib/auth-api';
import { MIN_PASSWORD_LENGTH } from '@/lib/password';
import { safeReturnPath } from '@/lib/return-path';
import { PasswordField } from './password-field';

export function ChangePasswordForm({ next }: { next: string | null }) {
  const router = useRouter();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
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
      const profile = await changePassword({
        currentPassword: String(form.get('currentPassword') ?? ''),
        newPassword,
      });
      showToast({ kind: 'success', message: 'Đã đổi mật khẩu.' });
      router.replace(safeReturnPath(profile, next) ?? profileDestination(profile));
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'đổi mật khẩu') });
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <PasswordField
        id="current-password"
        name="currentPassword"
        label="Mật khẩu hiện tại"
        autoComplete="current-password"
        maxLength={128}
        required
      />
      <PasswordField
        id="new-password"
        name="newPassword"
        label="Mật khẩu mới"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        required
      />
      <PasswordField
        id="confirm-password"
        name="confirmPassword"
        label="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        maxLength={128}
        required
      />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}
