'use client';

import { useState, type FormEvent } from 'react';

import { Field } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { reportFieldError } from '@/components/ui/form-validation';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateFamilyAccount, type FamilyAccount } from '@/lib/family-accounts-api';

const FORM_ID = 'account-email-form';

/**
 * Adds, changes or removes a member account's email, which signs the account in and receives its
 * Quên mật khẩu code. Errors, the API's included (an email already taken), show under the field.
 */
export function AccountEmailDialog({
  familySlug,
  account,
  onClose,
  onSaved,
}: {
  familySlug: string;
  account: FamilyAccount;
  onClose: () => void;
  onSaved: (account: FamilyAccount) => void;
}) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem('email');
    if (!(field instanceof HTMLInputElement)) return;
    const email = field.value.trim();
    if (email === (account.email ?? '')) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const saved = await updateFamilyAccount(familySlug, account.id, { email });
      showToast({
        kind: 'success',
        message: email
          ? `Đã cập nhật email cho ${account.displayName}.`
          : `Đã gỡ email của ${account.displayName}.`,
      });
      onSaved(saved);
    } catch (error: unknown) {
      reportFieldError(field, getApiErrorMessage(error, 'cập nhật email'));
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title={account.email ? 'Đổi email' : 'Thêm email'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu email'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="grid gap-3" onSubmit={handleSubmit}>
        <p className="text-sm leading-6 text-stone-600">
          Email để <strong className="font-semibold">{account.displayName}</strong> đăng nhập và
          nhận mã khi quên mật khẩu. Để trống rồi lưu để gỡ email.
        </p>
        <Field
          id="account-email-edit"
          name="email"
          type="email"
          label="Email"
          placeholder="nguyenvana@gmail.com"
          maxLength={191}
          autoComplete="off"
          defaultValue={account.email ?? ''}
          autoFocus
        />
      </form>
    </SheetDialog>
  );
}
