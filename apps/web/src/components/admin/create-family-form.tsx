'use client';

import {
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  LoaderCircle,
  Plus,
  TriangleAlert,
  UsersRound,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import { createFamily, type CreatedFamilyResult } from '@/lib/family-api';
import { SectionCard } from '@/components/admin/admin-layout';
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
    <SectionCard
      icon={<Plus aria-hidden="true" />}
      title="Tạo gia phả mới"
      description="Mỗi dòng họ có một đường dẫn riêng. Hệ thống tạo kèm một tài khoản Trưởng họ và một tài khoản Thành viên."
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
        <form className="grid content-start gap-5" onSubmit={handleSubmit}>
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
            label="Đường dẫn"
            placeholder="ho-nguyen"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            minLength={2}
            maxLength={100}
            hint="Chữ thường không dấu, nối bằng dấu gạch ngang. Ví dụ: giapha.vn/ho-nguyen"
            required
          />
          <DeathAnniversaryPicker
            id="death-anniversary"
            value={deathAnniversary}
            onChange={setDeathAnniversary}
            hint="Chọn ngày và tháng giỗ họ."
            required
          />
          <Button
            type="submit"
            size="lg"
            className="mt-1 sm:justify-self-start"
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {submitting ? 'Đang tạo…' : 'Tạo gia phả và tài khoản'}
          </Button>
        </form>

        {created ? (
          <div
            className="grid content-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-emerald-950">Đã tạo {created.family.name}</p>
                <p className="text-sm text-emerald-800">
                  Đường dẫn /{created.family.slug} · Ngày giỗ {created.family.deathAnniversary}
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
                    variant="outline"
                    onClick={() => copyCredential(label, account.username, account.password)}
                  >
                    {copied === label ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="size-3.5" aria-hidden="true" />
                    )}
                    {copied === label ? 'Đã sao chép' : 'Sao chép'}
                  </Button>
                </div>
                <dl className="mt-3 grid gap-1.5 text-sm">
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
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Mật khẩu chỉ hiển thị một lần tại đây. Hãy lưu và gửi riêng cho đúng người dùng.
            </p>
          </div>
        ) : (
          <div className="grid content-start gap-4 rounded-2xl border border-dashed border-emerald-900/20 bg-stone-50/60 p-5">
            <p className="font-medium text-emerald-950">Sau khi tạo, hệ thống sẽ cấp</p>
            <ul className="grid gap-3 text-sm leading-6 text-stone-600">
              <li className="flex gap-3">
                <KeyRound className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-emerald-950">Tài khoản Trưởng họ</strong> để
                  quản lý thông tin, thành viên và trang trí phả đồ.
                </span>
              </li>
              <li className="flex gap-3">
                <UsersRound className="mt-1 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <span>
                  <strong className="font-medium text-emerald-950">Tài khoản Thành viên</strong> để
                  con cháu xem cây gia phả.
                </span>
              </li>
            </ul>
            <p className="text-xs leading-5 text-stone-500">
              Tên đăng nhập và mật khẩu sẽ hiện ở đây ngay sau khi tạo xong.
            </p>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
