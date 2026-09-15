'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FormError } from './form-fields';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

export function InviteMember({ slug }: { slug: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{ email: string; invitationToken: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setInvitation(null);
    const email = String(new FormData(event.currentTarget).get('email') ?? '');

    try {
      const response = await fetch(`${API_URL}/families/${encodeURIComponent(slug)}/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        throw new Error(`Không thể tạo lời mời (${response.status})`);
      }

      const data = (await response.json()) as { email: string; invitationToken: string };
      setInvitation(data);
    } catch (submissionError: unknown) {
      setError(submissionError instanceof Error ? submissionError.message : 'Không thể tạo lời mời');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-7 rounded-2xl border bg-white/80 p-5" aria-labelledby="invite-heading">
      <h2 id="invite-heading" className="text-lg font-semibold text-emerald-950">
        Mời Thành viên
      </h2>
      <p className="mt-1 text-sm text-stone-600">Thành viên được mời chỉ có quyền xem gia phả.</p>
      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
        <div className="min-w-64 flex-1">
          <Field id="invited-email" name="email" label="Email Thành viên" type="email" required />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Đang tạo…' : 'Tạo mã mời'}
        </Button>
      </form>
      <div className="mt-3"><FormError message={error} /></div>
      {invitation ? (
        <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
          <p>Gửi riêng mã sau cho {invitation.email}, kèm địa chỉ <code>/register/member</code>.</p>
          <p className="mt-2 break-all rounded-lg border bg-white p-3 font-mono select-all">
            {invitation.invitationToken}
          </p>
          <p className="mt-2 text-xs">Mã chỉ hiện một lần. Không đăng công khai hoặc đưa vào URL.</p>
        </div>
      ) : null}
    </section>
  );
}
