'use client';

import {
  BadgeCheck,
  Check,
  Copy,
  HandCoins,
  HandHeart,
  Mail,
  MailCheck,
  Phone,
  Search,
  StickyNote,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { Segmented } from '@/components/ui/segmented';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import {
  deleteAmbassador,
  markCommissionsPaid,
  resendAmbassadorWelcome,
  updateAmbassador,
} from '@/lib/ambassador-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { displayPhone } from '@/lib/phone';
import { formatVnd } from '@/lib/vietnamese-number';
import { cn } from '@/lib/utils';
import type {
  Ambassador,
  AmbassadorCommission,
  AmbassadorCommissionKind,
  AmbassadorStatus,
} from '@/types/ambassador';

type Tab = 'ambassadors' | 'commissions';
type PaidFilter = 'PENDING' | 'PAID' | 'ALL';

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

const DATE = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });

const KIND_LABELS: Record<AmbassadorCommissionKind, string> = {
  NEW_FAMILY: 'Gia phả mới',
  PLAN_CHANGE: 'Đổi / nâng gói',
};

const STATUSES: ReadonlyArray<{ value: AmbassadorStatus; label: string; className: string }> = [
  {
    value: 'ACTIVE',
    label: 'Hoạt động',
    className: 'bg-emerald-50 text-emerald-900 ring-emerald-700/25',
  },
  {
    value: 'SUSPENDED',
    label: 'Tạm ngừng',
    className: 'bg-stone-100 text-stone-600 ring-stone-400/30',
  },
];

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

function StatTile({
  icon,
  label,
  value,
  hint,
  highlight = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-xl border p-3.5',
        highlight ? 'border-brand-700/30 bg-brand-50/70' : 'border-gold-500/25 bg-white/80',
      )}
    >
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-lg [&_svg]:size-5',
          highlight ? 'bg-brand-700 text-white' : 'bg-gold-100 text-brand-700',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-stone-500">{label}</span>
        <span className="block truncate text-lg font-bold text-brand-950">{value}</span>
        {hint ? <span className="block truncate text-xs text-stone-500">{hint}</span> : null}
      </span>
    </div>
  );
}

function NoteEditor({
  ambassador,
  onSave,
}: {
  ambassador: Ambassador;
  onSave: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState(ambassador.adminNote ?? '');
  const [saving, setSaving] = useState(false);
  const changed = note.trim() !== (ambassador.adminNote ?? '');

  return (
    <div className="grid gap-2">
      <label className="sr-only" htmlFor={`ambassador-note-${ambassador.id}`}>
        Ghi chú cho đại sứ {ambassador.fullName}
      </label>
      <textarea
        id={`ambassador-note-${ambassador.id}`}
        rows={2}
        maxLength={1000}
        value={note}
        placeholder="Ghi chú: số tài khoản nhận hoa hồng, ngân hàng, lần liên hệ…"
        onChange={(event) => setNote(event.currentTarget.value)}
        className="w-full rounded-lg border border-gold-700/35 bg-[var(--card)] px-3 py-2 text-sm outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15"
      />
      {changed ? (
        <Button
          type="button"
          size="sm"
          className="justify-self-end"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await onSave(note);
            setSaving(false);
          }}
        >
          {saving ? <InlineLoader className="size-4" /> : null}
          Lưu ghi chú
        </Button>
      ) : null}
    </div>
  );
}

/** Asks for the transfer reference before recording a payout; the money moves by bank. */
function PayDialog({
  commissions,
  onClose,
  onPaid,
}: {
  commissions: AmbassadorCommission[];
  onClose: () => void;
  onPaid: (saved: AmbassadorCommission[]) => void;
}) {
  const showToast = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const total = commissions.reduce((sum, entry) => sum + entry.amount, 0);
  const names = [...new Set(commissions.map((entry) => entry.ambassadorName))];

  async function pay(): Promise<void> {
    setBusy(true);
    try {
      const saved = await markCommissionsPaid(
        commissions.map((entry) => entry.id),
        note,
      );
      onPaid(saved);
      showToast({ kind: 'success', message: `Đã ghi nhận chi trả ${formatVnd(total)}.` });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'ghi nhận chi trả') });
      setBusy(false);
    }
  }

  return (
    <SheetDialog
      title="Xác nhận đã chi trả"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="button" onClick={() => void pay()} disabled={busy}>
            {busy ? <InlineLoader className="size-4" /> : <BadgeCheck className="size-4" />}
            Đã chi trả
          </Button>
        </>
      }
    >
      <div className="rounded-xl border border-gold-500/30 bg-gold-50/60 p-4 text-center">
        <p className="text-sm text-stone-600">
          {commissions.length} khoản hoa hồng cho {names.join(', ')}
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-brand-800">{formatVnd(total)}</p>
      </div>
      <p className="text-sm leading-6 text-stone-600">
        Chỉ bấm <strong>Đã chi trả</strong> sau khi bạn đã chuyển khoản xong. Thao tác này được ghi
        lại kèm thời điểm và người xác nhận, không hoàn tác được.
      </p>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-brand-950" htmlFor="payout-note">
          Mã giao dịch / ghi chú chuyển khoản (không bắt buộc)
        </label>
        <input
          id="payout-note"
          value={note}
          maxLength={255}
          placeholder="Ví dụ: VCB FT2410xxxx, chuyển ngày 20/10"
          onChange={(event) => setNote(event.currentTarget.value)}
          className="h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
        />
      </div>
    </SheetDialog>
  );
}

export function AmbassadorsPanel({
  initialAmbassadors,
  initialCommissions,
}: {
  initialAmbassadors: Ambassador[];
  initialCommissions: AmbassadorCommission[];
}) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [ambassadors, setAmbassadors] = useState(initialAmbassadors);
  const [commissions, setCommissions] = useState(initialCommissions);
  const [tab, setTab] = useState<Tab>('ambassadors');
  const [query, setQuery] = useState('');
  const [paidFilter, setPaidFilter] = useState<PaidFilter>('PENDING');
  const [ambassadorFilter, setAmbassadorFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [paying, setPaying] = useState<AmbassadorCommission[] | null>(null);

  const pending = commissions.filter((entry) => entry.paidAt === null);
  const pendingTotal = pending.reduce((sum, entry) => sum + entry.amount, 0);
  const paidTotal = commissions
    .filter((entry) => entry.paidAt !== null)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const activeCount = ambassadors.filter((entry) => entry.status === 'ACTIVE').length;
  const referredFamilies = ambassadors.reduce((sum, entry) => sum + entry.familyCount, 0);

  const shownAmbassadors = useMemo(() => {
    const needle = plain(query.trim());
    if (!needle) return ambassadors;
    return ambassadors.filter((entry) =>
      plain(
        `${entry.fullName} ${entry.code} ${entry.email} ${entry.phone} ${displayPhone(entry.phone)}`,
      ).includes(needle),
    );
  }, [ambassadors, query]);

  const shownCommissions = useMemo(
    () =>
      commissions.filter(
        (entry) =>
          (paidFilter === 'ALL' ||
            (paidFilter === 'PENDING' ? entry.paidAt === null : entry.paidAt !== null)) &&
          (!ambassadorFilter || entry.ambassadorId === ambassadorFilter),
      ),
    [commissions, paidFilter, ambassadorFilter],
  );
  const shownPending = shownCommissions.filter((entry) => entry.paidAt === null);

  function replaceAmbassador(saved: Ambassador): void {
    setAmbassadors((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
  }

  function applyPaid(saved: AmbassadorCommission[]): void {
    const byId = new Map(saved.map((entry) => [entry.id, entry]));
    const newlyPaid = commissions.filter(
      (entry) => entry.paidAt === null && byId.get(entry.id)?.paidAt,
    );
    setCommissions((current) => current.map((entry) => byId.get(entry.id) ?? entry));
    setAmbassadors((current) =>
      current.map((ambassador) => {
        const moved = newlyPaid.filter((entry) => entry.ambassadorId === ambassador.id);
        if (moved.length === 0) return ambassador;
        const amount = moved.reduce((sum, entry) => sum + entry.amount, 0);
        return {
          ...ambassador,
          pendingAmount: ambassador.pendingAmount - amount,
          pendingCount: ambassador.pendingCount - moved.length,
          paidAmount: ambassador.paidAmount + amount,
          paidCount: ambassador.paidCount + moved.length,
        };
      }),
    );
    setPaying(null);
  }

  async function changeStatus(entry: Ambassador, status: AmbassadorStatus): Promise<void> {
    setBusyId(entry.id);
    try {
      replaceAmbassador(await updateAmbassador(entry.id, { status }));
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật trạng thái') });
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(entry: Ambassador, note: string): Promise<boolean> {
    try {
      replaceAmbassador(await updateAmbassador(entry.id, { adminNote: note }));
      showToast({ kind: 'success', message: 'Đã lưu ghi chú.' });
      return true;
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu ghi chú') });
      return false;
    }
  }

  async function resend(entry: Ambassador): Promise<void> {
    setBusyId(entry.id);
    try {
      await resendAmbassadorWelcome(entry.id);
      showToast({ kind: 'success', message: `Đã gửi lại mã đại sứ tới ${entry.email}.` });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'gửi lại email') });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(entry: Ambassador): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa đại sứ ${entry.fullName}?`,
        message: `Mã ${entry.code} sẽ không dùng được nữa. Chỉ xóa được đại sứ chưa giới thiệu dòng họ nào.`,
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusyId(entry.id);
    try {
      await deleteAmbassador(entry.id);
      setAmbassadors((current) => current.filter((item) => item.id !== entry.id));
      showToast({ kind: 'success', message: 'Đã xóa đại sứ.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa đại sứ') });
    } finally {
      setBusyId(null);
    }
  }

  async function copyCode(code: string): Promise<void> {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
  }

  function showCommissionsOf(entry: Ambassador): void {
    setAmbassadorFilter(entry.id);
    setPaidFilter(entry.pendingCount > 0 ? 'PENDING' : 'ALL');
    setTab('commissions');
  }

  return (
    <SectionCard
      icon={<HandHeart aria-hidden="true" />}
      title="Đại Sứ Đời Đời"
      description="Người đăng ký làm đại sứ ở trang /dai-su nhận mã qua email. Gia phả tạo bằng mã đó sẽ ghi nhận hoa hồng theo mức cài ở Bảng giá. Bấm “Đã chi trả” sau khi chuyển khoản."
    >
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={<Users />}
            label="Đại sứ đang hoạt động"
            value={String(activeCount)}
            hint={`${ambassadors.length} người đã đăng ký`}
          />
          <StatTile
            icon={<HandHeart />}
            label="Dòng họ được giới thiệu"
            value={String(referredFamilies)}
          />
          <StatTile
            icon={<HandCoins />}
            label="Hoa hồng chờ chi trả"
            value={formatVnd(pendingTotal)}
            hint={`${pending.length} khoản`}
            highlight={pendingTotal > 0}
          />
          <StatTile icon={<Wallet />} label="Đã chi trả" value={formatVnd(paidTotal)} />
        </div>

        <Segmented
          label="Chọn danh sách"
          asTabs
          options={[
            { value: 'ambassadors', label: 'Đại sứ', count: ambassadors.length },
            { value: 'commissions', label: 'Hoa hồng', count: pending.length },
          ]}
          value={tab}
          onChange={setTab}
          className="sm:max-w-sm"
        />

        {tab === 'ambassadors' ? (
          <div className="grid gap-3">
            <div className="relative sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold-700"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                aria-label="Tìm đại sứ theo tên, mã, email hoặc số điện thoại"
                placeholder="Tìm tên, mã, email, số điện thoại…"
                onChange={(event) => setQuery(event.currentTarget.value)}
                className="h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] pl-10 pr-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
              />
            </div>

            {shownAmbassadors.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gold-500/40 py-10 text-center text-sm text-stone-500">
                {ambassadors.length === 0
                  ? 'Chưa có đại sứ nào. Người đăng ký ở trang Đại Sứ Đời Đời sẽ hiện ở đây.'
                  : 'Không có đại sứ nào khớp từ khóa.'}
              </p>
            ) : (
              <ul className="grid gap-3">
                {shownAmbassadors.map((entry) => {
                  const status = STATUSES.find((choice) => choice.value === entry.status);
                  const noteOpen = openNoteId === entry.id;
                  const busy = busyId === entry.id;
                  return (
                    <li
                      key={entry.id}
                      className={cn(
                        'grid gap-3 rounded-xl border bg-white/85 p-4',
                        entry.pendingCount > 0
                          ? 'border-brand-700/30 shadow-[inset_4px_0_0_var(--color-brand-700)]'
                          : 'border-gold-500/25',
                      )}
                    >
                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_auto] lg:items-center">
                        <div className="min-w-0">
                          <p
                            className="truncate font-semibold text-brand-950"
                            title={entry.fullName}
                          >
                            {entry.fullName}
                          </p>
                          <button
                            type="button"
                            onClick={() => void copyCode(entry.code)}
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-dashed border-gold-600/60 bg-gold-50 px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-brand-800 hover:bg-gold-100"
                            aria-label={`Sao chép mã ${entry.code}`}
                          >
                            {entry.code}
                            {copiedCode === entry.code ? (
                              <Check className="size-3.5 text-emerald-700" aria-hidden="true" />
                            ) : (
                              <Copy className="size-3.5 text-gold-700" aria-hidden="true" />
                            )}
                          </button>
                          <p className="mt-1 text-xs text-stone-500">
                            Đăng ký {DATE_TIME.format(new Date(entry.createdAt))}
                          </p>
                        </div>
                        <div className="grid min-w-0 gap-1 text-sm">
                          <a
                            href={`tel:${entry.phone.replace(/[^\d+]/g, '')}`}
                            className="inline-flex min-w-0 items-center gap-2 text-wood-800 hover:text-brand-800 hover:underline"
                          >
                            <Phone className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
                            <span className="truncate">{displayPhone(entry.phone)}</span>
                          </a>
                          <a
                            href={`mailto:${entry.email}`}
                            className="inline-flex min-w-0 items-center gap-2 text-wood-800 hover:text-brand-800 hover:underline"
                          >
                            <Mail className="size-4 shrink-0 text-gold-700" aria-hidden="true" />
                            <span className="truncate">{entry.email}</span>
                          </a>
                        </div>
                        <button
                          type="button"
                          onClick={() => showCommissionsOf(entry)}
                          className="grid grid-cols-3 gap-2 rounded-lg bg-paper/70 p-2 text-left ring-1 ring-inset ring-gold-500/20 transition hover:bg-gold-50"
                          aria-label={`Xem hoa hồng của ${entry.fullName}`}
                        >
                          <span className="min-w-0">
                            <span className="block text-[11px] text-stone-500">Dòng họ</span>
                            <span className="block font-semibold text-wood-800">
                              {entry.familyCount}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] text-stone-500">Chờ trả</span>
                            <span
                              className={cn(
                                'block truncate font-semibold',
                                entry.pendingAmount > 0 ? 'text-brand-700' : 'text-wood-800',
                              )}
                            >
                              {formatVnd(entry.pendingAmount)}
                            </span>
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[11px] text-stone-500">Đã trả</span>
                            <span className="block truncate font-semibold text-emerald-800">
                              {formatVnd(entry.paidAmount)}
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center gap-1.5">
                          <label className="sr-only" htmlFor={`ambassador-status-${entry.id}`}>
                            Trạng thái của đại sứ {entry.fullName}
                          </label>
                          <select
                            id={`ambassador-status-${entry.id}`}
                            value={entry.status}
                            disabled={busy}
                            onChange={(event) =>
                              void changeStatus(
                                entry,
                                event.currentTarget.value as AmbassadorStatus,
                              )
                            }
                            className={cn(
                              'h-9 rounded-full px-3 text-sm font-medium ring-1 ring-inset outline-none focus-visible:ring-2 focus-visible:ring-brand-700',
                              status?.className,
                            )}
                          >
                            {STATUSES.map((choice) => (
                              <option key={choice.value} value={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Gửi lại email chứa mã đại sứ"
                            aria-label={`Gửi lại mã đại sứ cho ${entry.fullName}`}
                            disabled={busyId !== null}
                            onClick={() => void resend(entry)}
                          >
                            {busy ? (
                              <InlineLoader className="size-4" />
                            ) : (
                              <MailCheck className="size-4" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-expanded={noteOpen}
                            aria-label={`Ghi chú cho ${entry.fullName}`}
                            onClick={() => setOpenNoteId(noteOpen ? null : entry.id)}
                            className={cn(entry.adminNote && 'text-brand-700')}
                          >
                            <StickyNote className="size-4" aria-hidden="true" />
                          </Button>
                          {entry.familyCount === 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Xóa đại sứ ${entry.fullName}`}
                              disabled={busyId !== null}
                              onClick={() => void remove(entry)}
                            >
                              <Trash2 className="size-4 text-red-700" aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                      {noteOpen ? (
                        <NoteEditor ambassador={entry} onSave={(note) => saveNote(entry, note)} />
                      ) : entry.adminNote ? (
                        <p className="whitespace-pre-line rounded-lg bg-gold-50/70 px-3 py-2 text-sm text-stone-700">
                          {entry.adminNote}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,22rem)_minmax(0,18rem)_1fr] lg:items-center">
              <Segmented
                label="Lọc theo tình trạng chi trả"
                options={[
                  { value: 'PENDING' as const, label: 'Chờ chi trả' },
                  { value: 'PAID' as const, label: 'Đã chi trả' },
                  { value: 'ALL' as const, label: 'Tất cả' },
                ]}
                value={paidFilter}
                onChange={setPaidFilter}
              />
              <div>
                <label className="sr-only" htmlFor="commission-ambassador">
                  Lọc theo đại sứ
                </label>
                <select
                  id="commission-ambassador"
                  value={ambassadorFilter}
                  onChange={(event) => setAmbassadorFilter(event.currentTarget.value)}
                  className="h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] px-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
                >
                  <option value="">Tất cả đại sứ</option>
                  {ambassadors.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.fullName} · {entry.code}
                    </option>
                  ))}
                </select>
              </div>
              {ambassadorFilter && shownPending.length > 1 ? (
                <Button
                  type="button"
                  className="lg:justify-self-end"
                  onClick={() => setPaying(shownPending)}
                >
                  <BadgeCheck className="size-4" aria-hidden="true" />
                  Đã chi trả tất cả ({shownPending.length} khoản)
                </Button>
              ) : null}
            </div>

            {shownCommissions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gold-500/40 py-10 text-center text-sm text-stone-500">
                {commissions.length === 0
                  ? 'Chưa có hoa hồng nào. Khi một gia phả được tạo bằng mã đại sứ trên gói có hoa hồng, khoản đó hiện ở đây.'
                  : 'Không có khoản hoa hồng nào khớp bộ lọc.'}
              </p>
            ) : (
              <ul className="grid gap-2.5">
                {shownCommissions.map((entry) => (
                  <li
                    key={entry.id}
                    className={cn(
                      'grid gap-3 rounded-xl border bg-white/85 p-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)_auto_auto] md:items-center',
                      entry.paidAt === null ? 'border-brand-700/25' : 'border-gold-500/20',
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-950">
                        {entry.familySlug ? (
                          <Link
                            href={`/${entry.familySlug}`}
                            className="hover:text-brand-700 hover:underline"
                          >
                            {entry.familyName}
                          </Link>
                        ) : (
                          entry.familyName
                        )}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {KIND_LABELS[entry.kind]} · Gói {entry.planName} · {entry.percent}% ·{' '}
                        {DATE.format(new Date(entry.createdAt))}
                      </p>
                    </div>
                    <div className="min-w-0 text-sm">
                      <p className="truncate text-wood-800">{entry.ambassadorName}</p>
                      <p className="font-mono text-xs font-semibold tracking-wide text-brand-800">
                        {entry.ambassadorCode}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-brand-800 md:text-right">
                      {formatVnd(entry.amount)}
                    </p>
                    {entry.paidAt === null ? (
                      <Button type="button" size="sm" onClick={() => setPaying([entry])}>
                        <BadgeCheck className="size-4" aria-hidden="true" />
                        Đã chi trả
                      </Button>
                    ) : (
                      <div className="text-xs leading-5 text-stone-600 md:text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-700/20">
                          <Check className="size-3.5" aria-hidden="true" />
                          Đã chi trả {DATE.format(new Date(entry.paidAt))}
                        </span>
                        {entry.paidByName ? <p className="mt-1">bởi {entry.paidByName}</p> : null}
                        {entry.paidNote ? (
                          <p className="max-w-56 truncate" title={entry.paidNote}>
                            {entry.paidNote}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      {paying ? (
        <PayDialog commissions={paying} onClose={() => setPaying(null)} onPaid={applyPaid} />
      ) : null}
    </SectionCard>
  );
}
