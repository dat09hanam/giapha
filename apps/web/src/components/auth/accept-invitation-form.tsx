'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { acceptInvitation, profileDestination } from '@/lib/auth-api';
import { Field, FormError } from './form-fields';

export function AcceptInvitationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const profile = await acceptInvitation({
        invitationToken: String(form.get('invitationToken') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
      });
      router.push(profileDestination(profile));
      router.refresh();
    } catch (submissionError: unknown) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Không thể nhận lời mời',
      );
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field
        id="invitationToken"
        name="invitationToken"
        label="Mã mời"
        type="password"
        autoComplete="off"
        minLength={32}
        hint="Dán mã do Trưởng họ gửi riêng cho bạn."
        required
      />
      <Field id="displayName" name="displayName" label="Họ và tên" autoComplete="name" required />
      <Field id="email" name="email" label="Email được mời" type="email" autoComplete="email" required />
      <Field
        id="password"
        name="password"
        label="Mật khẩu"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Đang tham gia…' : 'Tham gia dòng họ'}
      </Button>
    </form>
  );
}
