'use client';

import { CheckCircle2, Landmark, Link2, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Field, FormError } from '@/components/auth/form-fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateFamily } from '@/lib/family-api';
import type { FamilyDetails } from '@/types/family-tree';

type FamilyProfileValues = {
  name: string;
  ancestryOrigin: string;
  address: string;
  deathAnniversary: string;
  description: string;
};

function formatDeathAnniversary(family: FamilyDetails): string {
  if (family.deathAnniversaryDay === null || family.deathAnniversaryMonth === null) {
    return '';
  }

  const day = String(family.deathAnniversaryDay).padStart(2, '0');
  const month = String(family.deathAnniversaryMonth).padStart(2, '0');
  return `${day}/${month}`;
}

function familyToValues(family: FamilyDetails): FamilyProfileValues {
  return {
    name: family.name,
    ancestryOrigin: family.ancestryOrigin ?? '',
    address: family.address ?? '',
    deathAnniversary: formatDeathAnniversary(family),
    description: family.description ?? '',
  };
}

export function FamilyProfileForm({ family }: { family: FamilyDetails }) {
  const router = useRouter();
  const [values, setValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [savedValues, setSavedValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isDirty =
    values.name !== savedValues.name ||
    values.ancestryOrigin !== savedValues.ancestryOrigin ||
    values.address !== savedValues.address ||
    values.deathAnniversary !== savedValues.deathAnniversary ||
    values.description !== savedValues.description;

  function updateValue(field: keyof FamilyProfileValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await updateFamily(family.slug, {
        name: values.name,
        ancestryOrigin: values.ancestryOrigin,
        address: values.address,
        deathAnniversary: values.deathAnniversary.trim() || null,
        description: values.description,
      });
      const nextValues = familyToValues(updated);
      setValues(nextValues);
      setSavedValues(nextValues);
      setSaved(true);
      router.refresh();
    } catch (submissionError: unknown) {
      setError(getApiErrorMessage(submissionError, 'cập nhật thông tin dòng họ'));
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(): void {
    setValues(savedValues);
    setError(null);
    setSaved(false);
  }

  return (
    <Card className="bg-white/80 shadow-sm">
      <CardHeader>
        <span className="grid size-11 place-items-center rounded-2xl bg-emerald-100 text-emerald-900">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        <CardTitle className="mt-4 text-xl">Thông tin dòng họ</CardTitle>
        <p className="text-sm leading-6 text-stone-600">
          Cập nhật thông tin giới thiệu được hiển thị cho các thành viên của dòng họ.
        </p>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="family-profile-name"
              label="Tên dòng họ"
              value={values.name}
              onChange={(event) => updateValue('name', event.currentTarget.value)}
              autoComplete="organization"
              minLength={2}
              maxLength={191}
              required
            />

            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-emerald-950">Đường dẫn công khai</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border bg-stone-50 px-3 text-sm text-stone-600">
                <Link2 className="size-4 shrink-0" aria-hidden="true" />
                <code className="min-w-0 truncate">/{family.slug}</code>
              </div>
              <span className="text-xs text-stone-500">
                Đường dẫn được khóa để các liên kết đã chia sẻ luôn hoạt động.
              </span>
            </div>

            <Field
              id="family-profile-origin"
              label="Quê quán / nguồn gốc"
              value={values.ancestryOrigin}
              onChange={(event) => updateValue('ancestryOrigin', event.currentTarget.value)}
              placeholder="Ví dụ: Làng Đại Phùng, Hà Nội"
              maxLength={255}
            />

            <Field
              id="family-profile-address"
              label="Địa chỉ hiện nay"
              value={values.address}
              onChange={(event) => updateValue('address', event.currentTarget.value)}
              autoComplete="street-address"
              placeholder="Nơi sinh hoạt chính của dòng họ"
              maxLength={255}
            />

            <DeathAnniversaryPicker
              id="family-profile-anniversary"
              value={values.deathAnniversary}
              onChange={(value) => updateValue('deathAnniversary', value)}
              hint="Chọn ngày và tháng; để trống nếu chưa xác định."
            />
          </div>

          <label className="grid gap-1.5" htmlFor="family-profile-description">
            <span className="text-sm font-medium text-emerald-950">Giới thiệu dòng họ</span>
            <textarea
              id="family-profile-description"
              value={values.description}
              onChange={(event) => updateValue('description', event.currentTarget.value)}
              className="min-h-36 resize-y rounded-xl border bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
              placeholder="Ghi lại lịch sử hình thành, truyền thống và những thông tin chung của dòng họ…"
              maxLength={5000}
            />
            <span className="text-xs text-stone-500">
              Tối đa 5.000 ký tự. Không nhập thông tin riêng tư của từng thành viên tại đây.
            </span>
          </label>

          <FormError message={error} />
          {saved ? (
            <p
              className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="status"
            >
              <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
              Đã lưu thông tin dòng họ.
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={submitting || !isDirty}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Khôi phục
            </Button>
            <Button type="submit" disabled={submitting || !isDirty}>
              {submitting ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="size-4" aria-hidden="true" />
              )}
              {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
