'use client';

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { PersonSearch } from '@/components/tree/person-search';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { updateLibraryItem, type LibraryItem } from '@/lib/library-api';
import { familyMediaSrc } from '@/lib/media-api';
import { displayPersonTitle } from '@/lib/person-name';
import type { PersonSearchEntry } from '@/lib/person-search';
import { formatDay, todayInVietnam } from '@/lib/vietnam-date';

export type ItemDetailsValue = {
  title: string;
  description: string;
  takenOn: string;
  person: { id: string; name: string; honorific: string | null } | null;
};

export function detailsOf(item: LibraryItem): ItemDetailsValue {
  return {
    title: item.title ?? '',
    description: item.description ?? '',
    takenOn: item.takenOn ?? '',
    person: item.person,
  };
}

export function detailsPayload(value: ItemDetailsValue) {
  return {
    title: value.title.trim() || null,
    description: value.description.trim() || null,
    takenOn: value.takenOn || null,
    personId: value.person?.id ?? null,
  };
}

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm';

export function ItemDetailsFields({
  value,
  onChange,
  people,
  titleLabel,
  titleRequired = false,
  titlePlaceholder,
}: {
  value: ItemDetailsValue;
  onChange: (value: ItemDetailsValue) => void;
  people: PersonSearchEntry[];
  titleLabel: string;
  titleRequired?: boolean;
  titlePlaceholder: string;
}) {
  const patch = (changes: Partial<ItemDetailsValue>) => onChange({ ...value, ...changes });
  return (
    <>
      <label className="grid gap-1.5" htmlFor="library-title">
        <span className="text-sm font-medium text-stone-700">
          {titleLabel}
          {titleRequired ? null : (
            <span className="font-normal text-stone-400"> (không bắt buộc)</span>
          )}
        </span>
        <input
          id="library-title"
          className={`${inputClass} h-11`}
          value={value.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder={titlePlaceholder}
          maxLength={191}
          required={titleRequired}
        />
      </label>
      <label className="grid gap-1.5" htmlFor="library-description">
        <span className="text-sm font-medium text-stone-700">
          Mô tả <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        <textarea
          id="library-description"
          className={`${inputClass} field-sizing-content min-h-20 resize-none py-2.5 leading-6`}
          value={value.description}
          onChange={(event) => patch({ description: event.target.value })}
          maxLength={5000}
          rows={3}
        />
      </label>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-stone-700" htmlFor="library-date">
          Ngày <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </label>
        <DatePicker
          id="library-date"
          value={value.takenOn}
          onChange={(takenOn) => patch({ takenOn })}
          max={todayInVietnam()}
          allowClear
          placeholder="Chưa rõ"
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium text-stone-700">
          Người liên quan <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        {value.person ? (
          <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2">
            <UserRound className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
              {displayPersonTitle(value.person)}
            </span>
            <button
              type="button"
              onClick={() => patch({ person: null })}
              className="grid size-8 place-items-center rounded-full text-stone-500 hover:bg-stone-100"
              aria-label="Bỏ người liên quan"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <PersonSearch
            tone="light"
            label="Người liên quan"
            entries={people}
            onSelect={(personId) => {
              const entry = people.find((candidate) => candidate.person.id === personId);
              if (entry) {
                const { id, name, honorific } = entry.person;
                patch({ person: { id, name, honorific } });
              }
            }}
            onClear={() => undefined}
          />
        )}
      </div>
    </>
  );
}

export function ItemEditDialog({
  familySlug,
  item,
  people,
  onClose,
  onSaved,
}: {
  familySlug: string;
  item: LibraryItem;
  people: PersonSearchEntry[];
  onClose: () => void;
  onSaved: (item: LibraryItem) => void;
}) {
  const showToast = useToast();
  const [value, setValue] = useState(() => detailsOf(item));
  const [saving, setSaving] = useState(false);
  const isDocument = item.kind === 'DOCUMENT';

  async function save(): Promise<void> {
    setSaving(true);
    try {
      onSaved(await updateLibraryItem(familySlug, item.id, detailsPayload(value)));
      onClose();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu thông tin') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title={isDocument ? 'Sửa tư liệu' : 'Sửa thông tin ảnh'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || (isDocument && !value.title.trim())}
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Button>
        </>
      }
    >
      <ItemDetailsFields
        value={value}
        onChange={setValue}
        people={people}
        titleLabel={isDocument ? 'Tên tư liệu' : 'Chú thích'}
        titleRequired={isDocument}
        titlePlaceholder={
          isDocument ? 'Ví dụ: Sắc phong thời Tự Đức' : 'Ví dụ: Cả họ chụp trước nhà thờ'
        }
      />
    </SheetDialog>
  );
}

export function itemMeta(item: LibraryItem): string {
  return [
    item.takenOn ? formatDay(item.takenOn) : null,
    item.person ? displayPersonTitle(item.person) : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function LibraryLightbox({
  items,
  familySlug,
  startIndex,
  canManage,
  onClose,
  onEdit,
  onDelete,
}: {
  items: LibraryItem[];
  familySlug: string;
  startIndex: number;
  canManage: boolean;
  onClose: () => void;
  onEdit: (item: LibraryItem) => void;
  onDelete: (item: LibraryItem) => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);
  const item = items[Math.min(index, items.length - 1)];
  const last = items.length - 1;

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((current) => Math.max(0, current - 1));
      if (event.key === 'ArrowRight') setIndex((current) => Math.min(last, current + 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [last, onClose]);

  if (!item) return null;
  const meta = itemMeta(item);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      className="ui-backdrop fixed inset-0 z-[80] flex flex-col bg-stone-950/40 text-white backdrop-blur-2xl"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined || Math.abs(end - start) < 50) return;
        setIndex((current) =>
          end < start ? Math.min(last, current + 1) : Math.max(0, current - 1),
        );
      }}
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 px-3">
        <span className="text-sm text-white/70">
          {items.length > 1 ? `${index + 1} / ${items.length}` : ''}
        </span>
        <div className="flex gap-2">
          {canManage ? (
            <>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Sửa thông tin ảnh"
              >
                <PencilLine className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-red-500/60"
                aria-label="Xóa ảnh"
              >
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={familyMediaSrc(familySlug, item.url)}
          alt={item.title ?? ''}
          className="ui-dialog max-h-full max-w-full object-contain"
          draggable={false}
        />
        {index > 0 ? (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="absolute left-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            aria-label="Ảnh trước"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        ) : null}
        {index < last ? (
          <button
            type="button"
            onClick={() => setIndex(index + 1)}
            className="absolute right-2 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:grid"
            aria-label="Ảnh sau"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {item.title || item.description || meta ? (
        <div className="max-h-[35%] shrink-0 overflow-y-auto bg-gradient-to-t from-black to-black/60 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
          {item.title ? <p className="font-semibold">{item.title}</p> : null}
          {meta ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {meta}
            </p>
          ) : null}
          {item.description ? (
            <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-white/85">
              {item.description}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="h-6 shrink-0" />
      )}
    </div>
  );
}
