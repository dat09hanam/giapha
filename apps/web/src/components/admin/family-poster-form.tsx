'use client';

import { Frame, LoaderCircle, RotateCcw, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { Field } from '@/components/auth/form-fields';
import { PosterBackgroundSwatch, PosterSheet } from '@/components/tree/poster-art';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/admin/admin-layout';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateFamily } from '@/lib/family-api';
import { backgroundTreeArea, posterTreeRegion } from '@/lib/poster-geometry';
import type { FamilyPoster, PosterDecoration } from '@/lib/poster-decorations';
import type { FamilyDetails } from '@/types/family-tree';

const PREVIEW_WIDTH = 1920;
const PREVIEW_HEIGHT = 1080;

/** The full sheet at 1920 × 1080, scaled down to the width of its container. */
function PosterPreview({ poster, familyName }: { poster: FamilyPoster; familyName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const treeRegion = posterTreeRegion(PREVIEW_WIDTH, PREVIEW_HEIGHT, 1, backgroundTreeArea(poster));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(entry.contentRect.width / PREVIEW_WIDTH);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl border border-amber-900/15"
      aria-label="Xem trước phả đồ"
      role="img"
    >
      {scale > 0 ? (
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <PosterSheet
            width={PREVIEW_WIDTH}
            height={PREVIEW_HEIGHT}
            scale={1}
            settings={poster}
            familyName={familyName}
          />
          <p
            className="absolute grid place-items-center border-4 border-dashed border-[#c8102e]/35 text-[44px] font-semibold text-[#c8102e]/45"
            style={treeRegion}
          >
            Vùng đặt cây gia phả
          </p>
        </div>
      ) : null}
    </div>
  );
}

function BackgroundPicker({
  options,
  value,
  onChange,
}: {
  options: readonly PosterDecoration[];
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const choices: { id: string | null; name: string; decoration: PosterDecoration | null }[] = [
    ...options.map((decoration) => ({ id: decoration.id, name: decoration.name, decoration })),
    { id: null, name: 'Giấy trơn', decoration: null },
  ];
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm font-medium text-emerald-950">Hình nền</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {choices.map((choice) => {
          const selected = choice.id === value;
          return (
            <button
              key={choice.id ?? 'none'}
              type="button"
              onClick={() => onChange(choice.id)}
              aria-pressed={selected}
              className={
                'grid justify-items-center gap-2 rounded-xl border bg-white p-2 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ' +
                (selected
                  ? 'border-emerald-700 text-emerald-950 ring-2 ring-emerald-700/20'
                  : 'border-stone-200 text-stone-600 hover:border-emerald-700/40')
              }
            >
              <span className="grid h-[72px] w-full place-items-center overflow-hidden rounded-lg bg-[#fff6c9]">
                {choice.decoration ? (
                  <PosterBackgroundSwatch decoration={choice.decoration} width={128} height={72} />
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </span>
              <span className="line-clamp-2 text-center">{choice.name}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Lets the family head pick the phả đồ background from the platform library. */
export function FamilyPosterForm({
  family,
  decorations,
}: {
  family: FamilyDetails;
  decorations: PosterDecoration[];
}) {
  const router = useRouter();
  const showToast = useToast();
  const savedId = family.poster.background?.id ?? null;
  const initialLeftText = family.poster.leftText ?? '';
  const initialRightText = family.poster.rightText ?? '';
  const [value, setValue] = useState<string | null>(savedId);
  const [saved, setSaved] = useState<string | null>(savedId);
  const [leftText, setLeftText] = useState(initialLeftText);
  const [rightText, setRightText] = useState(initialRightText);
  const [savedLeftText, setSavedLeftText] = useState(initialLeftText);
  const [savedRightText, setSavedRightText] = useState(initialRightText);
  const [submitting, setSubmitting] = useState(false);
  const isDirty = value !== saved || leftText !== savedLeftText || rightText !== savedRightText;

  // The family's current pick stays resolvable even if the ADMIN has since hidden it.
  const byId = useMemo(() => {
    const current = family.poster.background ? [family.poster.background] : [];
    return new Map([...current, ...decorations].map((decoration) => [decoration.id, decoration]));
  }, [decorations, family.poster.background]);

  const previewPoster: FamilyPoster = {
    background: value ? (byId.get(value) ?? null) : null,
    leftText,
    rightText,
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const updated = await updateFamily(family.slug, {
        posterBackgroundId: value,
        posterLeftText: leftText,
        posterRightText: rightText,
      });
      const next = updated.poster.background?.id ?? null;
      const nextLeftText = updated.poster.leftText ?? '';
      const nextRightText = updated.poster.rightText ?? '';
      setValue(next);
      setSaved(next);
      setLeftText(nextLeftText);
      setRightText(nextRightText);
      setSavedLeftText(nextLeftText);
      setSavedRightText(nextRightText);
      showToast({ kind: 'success', message: 'Đã lưu trang trí phả đồ.' });
      router.refresh();
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu trang trí phả đồ') });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      icon={<Frame aria-hidden="true" />}
      title="Trang trí phả đồ"
      description="Chọn hình nền và câu chữ dọc hai bên."
      footer={
        <>
          {isDirty ? (
            <span className="text-sm text-amber-800 sm:mr-auto">Có thay đổi chưa lưu</span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setValue(saved);
              setLeftText(savedLeftText);
              setRightText(savedRightText);
            }}
            disabled={submitting || !isDirty}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Khôi phục
          </Button>
          <Button type="submit" form="family-poster-form" disabled={submitting || !isDirty}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {submitting ? 'Đang lưu…' : 'Lưu trang trí'}
          </Button>
        </>
      }
    >
      <form
        id="family-poster-form"
        className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2 lg:sticky lg:top-6">
          <p className="text-sm font-medium text-emerald-950">Xem trước</p>
          <PosterPreview poster={previewPoster} familyName={family.name} />
        </div>

        <div className="grid gap-7">
          <BackgroundPicker
            options={decorations.filter((decoration) => decoration.kind === 'BACKGROUND')}
            value={value}
            onChange={setValue}
          />

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium text-emerald-950">
              Câu chữ dọc hai bên
            </legend>
            <div className="grid gap-4">
              <Field
                id="poster-left-text"
                label="Chữ dọc bên trái"
                value={leftText}
                onChange={(event) => setLeftText(event.currentTarget.value)}
                maxLength={191}
                placeholder="Nhập nội dung bên trái"
              />
              <Field
                id="poster-right-text"
                label="Chữ dọc bên phải"
                value={rightText}
                onChange={(event) => setRightText(event.currentTarget.value)}
                maxLength={191}
                placeholder="Nhập nội dung bên phải"
              />
            </div>
          </fieldset>
        </div>
      </form>
    </SectionCard>
  );
}
