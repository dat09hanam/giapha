'use client';

import { Banknote, Gift, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { useConfirm } from '@/components/ui/confirm-dialog';
import { meritInputClass } from '@/components/merit/merit-event-dialog';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createMeritDonation,
  deleteMeritDonation,
  MAX_MERIT_AMOUNT,
  updateMeritDonation,
  type MeritDonation,
  type MeritDonationInput,
  type MeritDonationKind,
} from '@/lib/merit-api';
import { cn } from '@/lib/utils';
import { formatAmountInput, formatVnd, vndInWords } from '@/lib/vietnamese-number';
import { todayInVietnam } from '@/lib/vietnam-date';

const KINDS: readonly { value: MeritDonationKind; label: string; Icon: typeof Banknote }[] = [
  { value: 'CASH', label: 'Tiền mặt', Icon: Banknote },
  { value: 'ITEM', label: 'Hiện vật', Icon: Gift },
];

const digitsOf = (text: string): number => Number(text.replace(/\D/g, '')) || 0;

function AmountField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const amount = digitsOf(value);
  const tooLarge = amount > MAX_MERIT_AMOUNT;
  return (
    <label className="grid gap-1.5" htmlFor={id}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <span className="relative">
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          className={`${meritInputClass} h-11 pr-9 text-right font-semibold tabular-nums placeholder:font-normal`}
          placeholder="0"
          value={value}
          onChange={(event) => onChange(formatAmountInput(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">
          ₫
        </span>
      </span>
      <span
        className={cn('min-h-5 text-xs italic', tooLarge ? 'text-red-700' : 'text-stone-500')}
        aria-live="polite"
      >
        {tooLarge ? 'Số tiền quá lớn.' : amount > 0 ? vndInWords(amount) : null}
      </span>
    </label>
  );
}

export function MeritDonationDialog({
  familySlug,
  eventId,
  editing,
  onClose,
  onSaved,
  onDeleted,
}: {
  familySlug: string;
  eventId: string;
  editing: MeritDonation | null;
  onClose: () => void;
  onSaved: (donation: MeritDonation, previous: MeritDonation | null) => void;
  onDeleted: (donation: MeritDonation) => void;
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [donorName, setDonorName] = useState(editing?.donorName ?? '');
  const [kind, setKind] = useState<MeritDonationKind>(editing?.kind ?? 'CASH');
  const [amountText, setAmountText] = useState(
    editing?.amount ? formatAmountInput(String(editing.amount)) : '',
  );
  const [itemContent, setItemContent] = useState(editing?.itemContent ?? '');
  const [note, setNote] = useState(editing?.note ?? '');
  const [donatedOn, setDonatedOn] = useState(() => editing?.donatedOn ?? todayInVietnam());
  const [saving, setSaving] = useState(false);

  const amount = digitsOf(amountText);
  const valid =
    donorName.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(donatedOn) &&
    (kind === 'CASH' ? amount > 0 && amount <= MAX_MERIT_AMOUNT : itemContent.trim().length > 0);

  async function remove(donation: MeritDonation): Promise<void> {
    const what = donation.amount !== null ? formatVnd(donation.amount) : donation.itemContent;
    if (
      !(await confirm({
        title: `Xóa lượt công đức của ${donation.donorName}?`,
        message: what ?? undefined,
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    )
      return;
    setSaving(true);
    try {
      await deleteMeritDonation(familySlug, donation.id);
      onDeleted(donation);
      showToast({ kind: 'success', message: `Đã xóa lượt công đức của ${donation.donorName}.` });
      onClose();
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa lượt công đức') });
      setSaving(false);
    }
  }

  async function save(keepOpen: boolean): Promise<void> {
    if (!valid || saving) return;
    const cash = kind === 'CASH';
    const input: MeritDonationInput = {
      donorName: donorName.trim(),
      kind,
      amount: cash ? amount : null,
      itemContent: cash ? null : itemContent.trim(),
      note: note.trim() || null,
      donatedOn,
    };
    setSaving(true);
    try {
      const saved = editing
        ? await updateMeritDonation(familySlug, editing.id, input)
        : await createMeritDonation(familySlug, eventId, input);
      onSaved(saved, editing);
      showToast({
        kind: 'success',
        message: editing
          ? 'Đã lưu thay đổi.'
          : `Đã ghi công đức của ${saved.donorName}: ${
              saved.amount !== null ? formatVnd(saved.amount) : saved.itemContent
            }.`,
      });
      if (keepOpen) {
        setDonorName('');
        setAmountText('');
        setItemContent('');
        setNote('');
        setSaving(false);
        document.getElementById('merit-donor-name')?.focus();
      } else {
        onClose();
      }
    } catch (error) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'ghi công đức') });
      setSaving(false);
    }
  }

  return (
    <SheetDialog
      title={editing ? 'Sửa lượt công đức' : 'Ghi công đức'}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-700 hover:bg-red-50 sm:mr-auto"
              onClick={() => void remove(editing)}
              disabled={saving}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Xóa
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          {editing ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={() => void save(true)}
              disabled={!valid || saving}
            >
              Lưu và nhập tiếp
            </Button>
          )}
          <Button type="button" onClick={() => void save(false)} disabled={!valid || saving}>
            {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu'}
          </Button>
        </>
      }
    >
      <label className="grid gap-1.5" htmlFor="merit-donor-name">
        <span className="text-sm font-medium text-stone-700">Người công đức</span>
        <input
          id="merit-donor-name"
          className={`${meritInputClass} h-11`}
          placeholder="Ví dụ: Ông Nguyễn Văn An"
          value={donorName}
          onChange={(event) => setDonorName(event.target.value)}
          maxLength={100}
          autoFocus
        />
      </label>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium text-stone-700">Hình thức</legend>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map(({ value, label, Icon }) => {
            const selected = kind === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => setKind(value)}
                className={cn(
                  'flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition',
                  selected
                    ? 'border-red-900 bg-red-900 text-white shadow-sm'
                    : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {kind === 'CASH' ? (
        <AmountField
          id="merit-amount"
          label="Số tiền"
          value={amountText}
          onChange={setAmountText}
        />
      ) : (
        <label className="grid gap-1.5" htmlFor="merit-item-content">
          <span className="text-sm font-medium text-stone-700">Nội dung</span>
          <textarea
            id="merit-item-content"
            className={`${meritInputClass} field-sizing-content min-h-20 resize-none py-2.5 leading-6`}
            placeholder="Ví dụ: 1 chuông đồng, 2 mâm ngũ quả"
            value={itemContent}
            onChange={(event) => setItemContent(event.target.value)}
            maxLength={500}
            rows={3}
          />
        </label>
      )}

      <label className="grid gap-1.5" htmlFor="merit-note">
        <span className="text-sm font-medium text-stone-700">
          Ghi chú <span className="font-normal text-stone-400">(không bắt buộc)</span>
        </span>
        <input
          id="merit-note"
          className={`${meritInputClass} h-11`}
          placeholder="Ví dụ: Chi 2, ở Hà Nội"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
        />
      </label>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-stone-700" htmlFor="merit-date">
          Ngày công đức (Dương lịch)
        </label>
        <DatePicker id="merit-date" value={donatedOn} onChange={setDonatedOn} />
      </div>
    </SheetDialog>
  );
}
