'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { profileDestination, registerClanHead } from '@/lib/auth-api';
import { Field, FormError } from './form-fields';

export function RegisterClanHeadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const profile = await registerClanHead({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        displayName: String(form.get('displayName') ?? ''),
        clanName: String(form.get('clanName') ?? ''),
        slug: String(form.get('slug') ?? ''),
      });
      router.push(profileDestination(profile));
      router.refresh();
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Không thể đăng ký');
      setSubmitting(false);
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <Field id="displayName" name="displayName" label="Họ và tên" autoComplete="name" required />
      <Field id="email" name="email" label="Email" type="email" autoComplete="email" required />
      <Field
        id="password"
        name="password"
        label="Mật khẩu"
        type="password"
        autoComplete="new-password"
        minLength={10}
        hint="Tối thiểu 10 ký tự."
        required
      />
      <Field id="clanName" name="clanName" label="Tên dòng họ" placeholder="Dòng họ Nguyễn Văn" required />
      <Field
        id="slug"
        name="slug"
        label="Địa chỉ dòng họ"
        placeholder="nguyen-van"
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        hint="Dùng chữ thường, số và dấu gạch ngang; ví dụ giapha.vn/nguyen-van."
        required
      />
      <FormError message={error} />
      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? 'Đang tạo dòng họ…' : 'Tạo tài khoản MemberPlus (Trưởng họ)'}
      </Button>
    </form>
  );
}
