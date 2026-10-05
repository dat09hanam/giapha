'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createMeritEvent,
  updateMeritEvent,
  type MeritEvent,
  type MeritEventInput,
} from '@/lib/merit-api';

export const meritInputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 sm:text-sm';

/** Creates a Công đức event, or edits `editing`; the clan head only. */
export function MeritEventDialog({
  familySlug,
  editing,
  onClose,
  onSaved,
}: {
  familySlug: string;
  editing: MeritEvent | null;
  onClose: () => void;
  onSaved: (event: MeritEvent) => void;
}) {
  const showToast = useToast();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [heldOn, setHeldOn] = useState(editing?.heldOn ?? '');
  const [saving, setSaving] = useState(false);

  async function save(): Promise<void> {
    const input: MeritEventInput = {
      title: title.trim(),
      description: description.trim() || null,
      heldOn: heldOn || null,
    };
    setSaving(true);
    try {
      const saved = editing
        ? await updateMeritEvent(familySlug, editing.id, input)
        : await createMeritEvent(familySlug, input);
      onSaved(saved);
      showToast({
        kind: 'success',
        message: editing ? 'Đã lưu thay đổi.' : `Đã tạo sự kiện “${saved.title}”.`,
      });
    } catch (error) {
      showToast({
        kind: 'error',
        message: getApiErrorMessage(error, editing ? 'sửa sự kiện' : 'tạo sự kiện'),
      });
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title={editing ? 'Sửa sự kiện' : 'Sự kiện công đức mới'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving || !title.trim()}>
            {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo sự kiện'}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5" htmlFor="merit-event-title">
        <span className="text-sm font-medium text-stone-700">Tên sự kiện</span>
        <input
          id="merit-event-title"
          className={`${meritInputClass} h-11`}
          placeholder="Ví dụ: Tu sửa nhà thờ họ năm 2026"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={191}
          autoFocus
        />
      </label>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-stone-700" htmlFor="merit-event-date">
          Ngày tổ chức <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </label>
        <DatePicker id="merit-event-date" value={heldOn} onChange={setHeldOn} allowClear />
      </div>
      <label className="grid gap-1.5" htmlFor="merit-event-description">
        <span className="text-sm font-medium text-stone-700">
          Mô tả <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        <textarea
          id="merit-event-description"
          className={`${meritInputClass} field-sizing-content min-h-20 resize-none py-2.5 leading-6`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
          rows={3}
        />
      </label>
    </SheetDialog>
  );
}
