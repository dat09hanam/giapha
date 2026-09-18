'use client';

import { CheckCircle2, Copy, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import { createFamily, type CreatedFamilyResult } from '@/lib/family-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/auth/form-fields';
import { useToast } from '@/components/ui/toast';

export function CreateFamilyForm() {
  const [deathAnniversary, setDeathAnniversary] = useState('');
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedFamilyResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setCreated(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const body = await createFamily({
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        deathAnniversary,
      });
      setCreated(body);
      formElement.reset();
      setDeathAnniversary('');
      showToast({
        kind: 'success',
        message: `Đã tạo dòng họ ${body.family.name}.`,
      });
    } catch (submissionError: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(submissionError, 'tạo dòng họ'),
      });
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
          <DeathAnniversaryPicker
            id="death-anniversary"
            value={deathAnniversary}
            onChange={setDeathAnniversary}
            hint="Chọn ngày và tháng giỗ họ."
            required
          />
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
