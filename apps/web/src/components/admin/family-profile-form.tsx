'use client';

import { Check, Copy, ExternalLink, Landmark, Link2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';

import { InlineLoader } from '@/components/ui/heritage-loader';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { DeathAnniversaryPicker } from '@/components/ui/death-anniversary-picker';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateFamily } from '@/lib/family-api';
import { plainToRichText, richTextIsEmpty } from '@/lib/rich-text';
import { useUnsavedChangesGuard } from '@/lib/use-unsaved-changes-guard';
import { cn } from '@/lib/utils';
import type { FamilyDetails } from '@/types/family-tree';
import type { RichTextDocument } from '@/types/rich-text';

type FamilyProfileValues = {
  name: string;
  ancestryOrigin: string;
  address: string;
  deathAnniversary: string;
};

const INPUT_CLASS =
  'w-full rounded-xl border border-gold-700/40 bg-white px-3.5 text-base text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15';

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
  };
}

function introductionOf(family: FamilyDetails): RichTextDocument {
  return family.introduction ?? plainToRichText(family.description);
}

const noSubscribe = (): (() => void) => () => undefined;

/** The site origin, known only in the browser; empty while rendering on the server. */
function useOrigin(): string {
  return useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => '',
  );
}

function OptionalHint() {
  return <span className="text-xs font-normal text-stone-500">Không bắt buộc</span>;
}

function FieldLabel({
  htmlFor,
  id,
  required = false,
  children,
}: {
  htmlFor?: string;
  id?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label
      id={id}
      htmlFor={htmlFor}
      className="flex items-baseline justify-between gap-2 text-sm font-medium text-brand-950"
    >
      <span>
        {children}
        {required ? (
          <>
            <span className="ml-0.5 text-red-600" aria-hidden="true">
              *
            </span>
            <span className="sr-only"> (bắt buộc)</span>
          </>
        ) : null}
      </span>
      {required ? null : <OptionalHint />}
    </label>
  );
}

/** One line of text that may wrap while typing; Enter never adds a line break. */
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
    <div className="grid gap-1.5 md:col-span-2" data-field="">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea
        id={id}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value.replace(/\s*\n\s*/g, ' '))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={255}
        className={cn(INPUT_CLASS, 'field-sizing-content min-h-12 resize-none py-3 leading-6')}
      />
      <span data-field-error="" aria-live="polite" />
    </div>
  );
}

function PublicLinkField({ slug }: { slug: string }) {
  const showToast = useToast();
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);
  const path = `/${encodeURIComponent(slug)}`;
  const url = `${origin}${path}`;

  async function copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      showToast({ kind: 'success', message: 'Đã sao chép đường dẫn chia sẻ.' });
    } catch {
      showToast({ kind: 'error', message: 'Không sao chép được. Hãy chọn và sao chép thủ công.' });
    }
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-medium text-brand-950">Đường dẫn chia sẻ</span>
      <div className="flex min-w-0 gap-2">
        <div className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-xl border border-gold-500/30 bg-paper px-3.5 text-stone-700">
          <Link2 className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
          <span className="min-w-0 truncate text-[15px]" title={url}>
            {origin ? url.replace(/^https?:\/\//, '') : path}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          className="size-12 shrink-0 px-0"
          onClick={() => void copy()}
          aria-label="Sao chép đường dẫn"
          title="Sao chép đường dẫn"
        >
          {copied ? (
            <Check className="size-5" aria-hidden="true" />
          ) : (
            <Copy className="size-5" aria-hidden="true" />
          )}
        </Button>
        <Button asChild variant="outline" className="size-12 shrink-0 px-0">
          <a
            href={path}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở trang dòng họ trong thẻ mới"
            title="Mở trang dòng họ"
          >
            <ExternalLink className="size-5" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </div>
  );
}

export function FamilyProfileForm({ family }: { family: FamilyDetails }) {
  const router = useRouter();
  const [values, setValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [savedValues, setSavedValues] = useState<FamilyProfileValues>(() => familyToValues(family));
  const [submitting, setSubmitting] = useState(false);
  const [introduction, setIntroduction] = useState(() => introductionOf(family));
  const [savedIntroduction, setSavedIntroduction] = useState(() => introductionOf(family));
  const [editorKey, setEditorKey] = useState(0);
  const showToast = useToast();

  const isDirty =
    values.name !== savedValues.name ||
    values.ancestryOrigin !== savedValues.ancestryOrigin ||
    values.address !== savedValues.address ||
    values.deathAnniversary !== savedValues.deathAnniversary ||
    JSON.stringify(introduction) !== JSON.stringify(savedIntroduction);
  useUnsavedChangesGuard(isDirty);

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
        introduction: richTextIsEmpty(introduction) ? null : introduction,
      });
      const nextValues = familyToValues(updated);
      setValues(nextValues);
      setSavedValues(nextValues);
      const nextIntroduction = introductionOf(updated);
      setIntroduction(nextIntroduction);
      setSavedIntroduction(nextIntroduction);
      setEditorKey((key) => key + 1);
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
    setIntroduction(savedIntroduction);
    setEditorKey((key) => key + 1);
  }

  return (
    <form
      id="family-profile-form"
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-3xl rounded-2xl border border-gold-500/25 bg-white shadow-sm"
    >
      <header className="flex items-center gap-3.5 rounded-t-2xl border-b border-gold-500/20 bg-paper px-4 py-4 sm:px-7 sm:py-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold-100 text-brand-700 ring-1 ring-inset ring-gold-500/30">
          <Landmark className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-7 text-stone-900">Thông tin dòng họ</h2>
          <p className="text-sm text-stone-600">Cập nhật thông tin chung của dòng họ bạn</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 px-4 py-5 sm:px-7 sm:py-6 md:grid-cols-2">
        <div className="grid gap-1.5" data-field="">
          <FieldLabel htmlFor="family-profile-name" required>
            Tên dòng họ
          </FieldLabel>
          <input
            id="family-profile-name"
            value={values.name}
            onChange={(event) => updateValue('name', event.currentTarget.value)}
            placeholder="Ví dụ: Họ Nguyễn làng Đại Phùng"
            autoComplete="organization"
            minLength={2}
            maxLength={191}
            required
            className={cn(INPUT_CLASS, 'h-12')}
          />
          <span data-field-error="" aria-live="polite" />
        </div>

        <PublicLinkField slug={family.slug} />

        <AddressField
          id="family-profile-origin"
          label="Quê quán / nguồn gốc"
          value={values.ancestryOrigin}
          onChange={(value) => updateValue('ancestryOrigin', value)}
          placeholder="Ví dụ: Làng Đại Phùng, Đan Phượng, Hà Nội"
        />

        <AddressField
          id="family-profile-address"
          label="Địa chỉ hiện nay"
          value={values.address}
          onChange={(value) => updateValue('address', value)}
          autoComplete="street-address"
          placeholder="Ví dụ: Nhà thờ họ, thôn Vũ Xá, Kim Động, Hưng Yên"
        />

        <DeathAnniversaryPicker
          id="family-profile-anniversary"
          value={values.deathAnniversary}
          onChange={(value) => updateValue('deathAnniversary', value)}
          labelHint={<OptionalHint />}
          triggerClassName="h-12 rounded-xl border-gold-700/40 px-3.5 text-base sm:text-base"
        />

        <div className="grid gap-1.5 md:col-span-2">
          <FieldLabel id="family-profile-introduction-label">Giới thiệu dòng họ</FieldLabel>
          <RichTextEditor
            key={editorKey}
            id="family-profile-introduction"
            labelledBy="family-profile-introduction-label"
            initial={introduction}
            onChange={setIntroduction}
            compact
            placeholder="Ví dụ: Dòng họ lập nghiệp tại làng từ thế kỷ XVII, nhà thờ họ dựng năm 1890…"
          />
        </div>
      </div>

      {/* Stays above the bottom tab bar on phones while the form scrolls, never covering a field
          once the form's end is reached. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-end gap-2 rounded-b-2xl border-t border-gold-500/20 bg-paper/95 px-4 py-2 backdrop-blur sm:px-7 lg:bottom-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={resetForm}
          disabled={submitting || !isDirty}
        >
          Hủy
        </Button>
        <Button type="submit" size="sm" className="shrink-0" disabled={submitting || !isDirty}>
          {submitting ? (
            <InlineLoader className="size-3.5" />
          ) : (
            <Save className="size-3.5" aria-hidden="true" />
          )}
          {submitting ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
      </div>
    </form>
  );
}
