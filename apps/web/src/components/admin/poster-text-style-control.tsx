'use client';

import { Check } from 'lucide-react';
import { PosterFamilyName, PosterVerticalText } from '@/components/tree/poster-art';
import type { PosterInsets } from '@/lib/poster-decorations';
import {
  matchingPreset,
  textPresetsFor,
  type PosterTextKind,
  type PosterTextPreset,
  type PosterTextStyle,
} from '@/lib/poster-text-style';
import { cn } from '@/lib/utils';

const NAME_PREVIEW = { width: 168, height: 56, text: 'Họ Nguyễn' };
const VERTICAL_PREVIEW = { width: 72, height: 104, text: 'Phúc Lộc' };
const PREVIEW_PADDING: PosterInsets = { top: 6, right: 4, bottom: 6, left: 4 };

/**
 * Picks one of ten ready-made looks for a poster text area. A preset sets the area's colour and
 * style together; an older background with no style keeps its look until a preset is chosen.
 */
export function PosterTextStyleControl({
  kind,
  color,
  style,
  curve = 0,
  onChange,
}: {
  kind: PosterTextKind;
  color: string;
  style: PosterTextStyle | null;
  /** The name's arch, so its samples bend like the poster. */
  curve?: number;
  onChange: (color: string, style: PosterTextStyle) => void;
}) {
  const selected = matchingPreset(kind, color, style);
  const presets = textPresetsFor(kind);

  return (
    <div className="grid gap-3 rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-brand-950">Mẫu chữ</span>
        <span className="text-xs text-stone-500">
          {selected
            ? `Đang dùng: ${selected.name}`
            : 'Đang dùng kiểu chữ hiện tại. Bấm một mẫu để đổi.'}
        </span>
      </div>
      <div
        className={cn(
          'grid gap-2',
          kind === 'name'
            ? 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]'
            : 'grid-cols-[repeat(auto-fill,minmax(96px,1fr))]',
        )}
        role="radiogroup"
        aria-label="Mẫu chữ"
      >
        {presets.map((preset) => (
          <PresetCard
            key={preset.id}
            kind={kind}
            preset={preset}
            curve={curve}
            selected={preset.id === selected?.id}
            onSelect={() => onChange(preset.color, preset.style)}
          />
        ))}
      </div>
    </div>
  );
}

function PresetCard({
  kind,
  preset,
  curve,
  selected,
  onSelect,
}: {
  kind: PosterTextKind;
  preset: PosterTextPreset;
  curve: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const sample = kind === 'name' ? NAME_PREVIEW : VERTICAL_PREVIEW;
  const sampleArea = { ...PREVIEW_PADDING, color: preset.color, style: preset.style };
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative grid justify-items-center gap-1.5 rounded-lg border p-1.5 pb-2 text-xs font-medium transition',
        selected
          ? 'border-brand-700 bg-brand-50 text-brand-900 ring-2 ring-brand-700'
          : 'border-stone-200 bg-white text-stone-600 hover:border-brand-700/40 hover:bg-gold-50',
      )}
    >
      <span
        className="relative block w-full overflow-hidden"
        style={{ height: sample.height }}
        aria-hidden="true"
      >
        <span
          className="absolute top-0 left-1/2 block -translate-x-1/2"
          style={{ width: sample.width, height: sample.height }}
        >
          {kind === 'name' ? (
            <PosterFamilyName
              area={{ ...sampleArea, curve }}
              name={sample.text}
              width={sample.width}
              height={sample.height}
            />
          ) : (
            <PosterVerticalText
              area={sampleArea}
              text={sample.text}
              width={sample.width}
              height={sample.height}
            />
          )}
        </span>
      </span>
      <span className="text-center leading-tight">{preset.name}</span>
      {selected ? (
        <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-brand-700 text-white">
          <Check className="size-3" aria-hidden="true" />
        </span>
      ) : null}
    </button>
  );
}
