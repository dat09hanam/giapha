'use client';

import { CheckCircle2, Copy, Plus } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FormError } from '@/components/auth/form-fields';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');

type CreatedFamilyResult = {
  family: {
    id: string;
    name: string;
    slug: string;
    deathAnniversary: string;
  };
  accounts: {
    memberPlus: { role: 'MEMBER_PLUS'; username: string; password: string };
    member: { role: 'MEMBER'; username: string; password: string };
  };
};

function maskedAnniversary(digits: string): string {
  const padded = `${digits}____`.slice(0, 4);
  return `${padded.slice(0, 2)}/${padded.slice(2, 4)}`;
}

function responseError(body: unknown, status: number): string {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join('. ');
    }
  }
  return `Không thể tạo gia phả (${status})`;
}

export function CreateFamilyForm() {
  const [anniversaryDigits, setAnniversaryDigits] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedFamilyResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function handleAnniversaryKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      setAnniversaryDigits((current) => `${current}${event.key}`.slice(0, 4));
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      setAnniversaryDigits((current) => current.slice(0, -1));
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      setAnniversaryDigits('');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreated(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const response = await fetch(`${API_URL}/families`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          slug: String(form.get('slug') ?? ''),
          deathAnniversary: maskedAnniversary(anniversaryDigits),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(responseError(body, response.status));
      setCreated(body as CreatedFamilyResult);
      formElement.reset();
      setAnniversaryDigits('');
    } catch (submissionError: unknown) {
      setError(
        submissionError instanceof Error ? submissionError.message : 'Không thể tạo gia phả',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyCredential(label: string, username: string, password: string): Promise<void> {
    await navigator.clipboard.writeText(`Tên đăng nhập: ${username}\nMật khẩu: ${password}`);
    setCopied(label);
  }

  return (
    <Card className="bg-white/80 shadow-sm">
      <CardHeader>
        <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
          <Plus className="size-5" aria-hidden="true" />
        </span>
        <CardTitle className="mt-4 text-xl">Tạo gia phả mới</CardTitle>
        <p className="text-sm leading-6 text-stone-600">
          Hệ thống sẽ tạo đồng thời một tài khoản Trưởng họ và một tài khoản Thành viên.
        </p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Field
            id="family-name"
            name="name"
            label="Tên dòng họ"
            placeholder="Họ Nguyễn"
            minLength={2}
            maxLength={100}
            required
          />
          <Field
            id="family-slug"
            name="slug"
            label="URL"
            placeholder="ho-nguyen"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={100}
            hint="Ví dụ: giapha.vn/ho-nguyen"
            required
          />
          <Field
            id="death-anniversary"
            name="deathAnniversary"
            label="Ngày giỗ họ"
            value={maskedAnniversary(anniversaryDigits)}
            onKeyDown={handleAnniversaryKeyDown}
            onChange={(event) => {
              setAnniversaryDigits(event.currentTarget.value.replace(/\D/g, '').slice(0, 4));
            }}
            onPaste={(event) => {
              event.preventDefault();
              setAnniversaryDigits(
                event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4),
              );
            }}
            inputMode="numeric"
            autoComplete="off"
            pattern="\d{2}/\d{2}"
            hint="Nhập đủ ngày và tháng theo định dạng DD/MM."
            required
          />
          <FormError message={error} />
          <Button type="submit" disabled={submitting}>
            <Plus className="size-4" aria-hidden="true" />
            {submitting ? 'Đang tạo…' : 'Tạo gia phả và tài khoản'}
          </Button>
        </form>

        {created ? (
          <div
            className="mt-6 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-emerald-700" aria-hidden="true" />
              <div>
                <p className="font-semibold text-emerald-950">Đã tạo {created.family.name}</p>
                <p className="text-sm text-emerald-800">
                  URL: /{created.family.slug} · Ngày giỗ: {created.family.deathAnniversary}
                </p>
              </div>
            </div>
            {(
              [
                ['Trưởng họ', created.accounts.memberPlus],
                ['Thành viên', created.accounts.member],
              ] as const
            ).map(([label, account]) => (
              <div key={label} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-emerald-950">{label}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => copyCredential(label, account.username, account.password)}
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                    {copied === label ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
                <dl className="mt-2 grid gap-1 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-stone-500">Tên đăng nhập</dt>
                    <dd className="break-all font-mono font-medium">{account.username}</dd>
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="text-stone-500">Mật khẩu</dt>
                    <dd className="break-all font-mono font-medium">{account.password}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <p className="text-xs leading-5 text-amber-800">
              Mật khẩu chỉ hiển thị trong kết quả này. Hãy lưu và gửi riêng cho đúng người dùng.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
