'use client';

import { Landmark, Link2, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Field } from '@/components/auth/form-fields';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/admin-layout';
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

/**
 * A one-line address that wraps instead of scrolling sideways, so a long
 * thôn – xã – huyện – tỉnh reads in full. It spans both columns from md and
 * grows with its text; Enter does not add a line break.
 */
function AddressField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1.5 md:col-span-2" htmlFor={id}>
      <span className="text-sm font-medium text-emerald-950">{label}</span>
      <textarea
        id={id}
        // Browsers without field-sizing (older iOS, Firefox) show two lines.
        rows={2}
        value={value}
        // A pasted line break becomes a space; the value stays one line.
        onChange={(event) => onChange(event.currentTarget.value.replace(/\s*\n\s*/g, ' '))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={255}
        className="field-sizing-content min-h-11 resize-none rounded-xl border bg-white px-3 py-2.5 text-base leading-6 outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:text-sm"
      />
    </label>
  );
}

export function FamilyProfileForm({ family }: { family: FamilyDetails }) {
  const router = useRouter();
  const [values, setValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [savedValues, setSavedValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToast();

  const isDirty =
    values.name !== savedValues.name ||
    values.ancestryOrigin !== savedValues.ancestryOrigin ||
    values.address !== savedValues.address ||
    values.deathAnniversary !== savedValues.deathAnniversary ||
    values.description !== savedValues.description;

  function updateValue(field: keyof FamilyProfileValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);

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
      showToast({ kind: 'success', message: 'Đã lưu thông tin dòng họ.' });
      router.refresh();
    } catch (submissionError: unknown) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(submissionError, 'cập nhật thông tin dòng họ'),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(): void {
    setValues(savedValues);
  }

  return (
    <SectionCard
      icon={<Landmark aria-hidden="true" />}
      title="Thông tin dòng họ"
      footer={
        <>
          {isDirty ? (
            <span className="text-sm text-amber-800 sm:mr-auto">Có thay đổi chưa lưu</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={submitting || !isDirty}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Khôi phục
          </Button>
          <Button type="submit" form="family-profile-form" disabled={submitting || !isDirty}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
          </Button>
        </>
      }
    >
      <form id="family-profile-form" className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
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
          </div>

          <AddressField
            id="family-profile-origin"
            label="Quê quán / nguồn gốc"
            value={values.ancestryOrigin}
            onChange={(value) => updateValue('ancestryOrigin', value)}
            placeholder="Ví dụ: Làng Đại Phùng, Hà Nội"
          />

          <AddressField
            id="family-profile-address"
            label="Địa chỉ hiện nay"
            value={values.address}
            onChange={(value) => updateValue('address', value)}
            autoComplete="street-address"
            placeholder="Nơi sinh hoạt chính của dòng họ"
          />

          <DeathAnniversaryPicker
            id="family-profile-anniversary"
            value={values.deathAnniversary}
            onChange={(value) => updateValue('deathAnniversary', value)}
          />
        </div>

        <label className="grid gap-1.5" htmlFor="family-profile-description">
          <span className="text-sm font-medium text-emerald-950">Giới thiệu dòng họ</span>
          <textarea
            id="family-profile-description"
            value={values.description}
            onChange={(event) => updateValue('description', event.currentTarget.value)}
            className="min-h-44 resize-y rounded-xl border bg-white px-3 py-3 text-base leading-6 outline-none sm:text-sm transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15"
            placeholder="Ghi lại lịch sử hình thành, truyền thống và những thông tin chung của dòng họ…"
            maxLength={5000}
          />
          <span className="text-xs text-stone-500">
            Tối đa 5.000 ký tự. Không nhập thông tin riêng tư của từng thành viên tại đây.
          </span>
        </label>
      </form>
    </SectionCard>
  );
}
