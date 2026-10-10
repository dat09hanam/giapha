'use client';

import { ClipboardList, Mail, Phone, Search, StickyNote, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { SectionCard } from '@/components/admin/admin-layout';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { Segmented } from '@/components/ui/segmented';
import { useToast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import { displayPhone } from '@/lib/phone';
import { deleteServiceRegistration, updateServiceRegistration } from '@/lib/pricing-api';
import { cn } from '@/lib/utils';
import type { ServiceRegistration, ServiceRegistrationStatus } from '@/types/pricing';

const STATUSES: ReadonlyArray<{
  value: ServiceRegistrationStatus;
  label: string;
  className: string;
}> = [
  { value: 'NEW', label: 'Mới', className: 'bg-brand-50 text-brand-800 ring-brand-700/25' },
  {
    value: 'CONTACTED',
    label: 'Đã liên hệ',
    className: 'bg-amber-50 text-amber-900 ring-amber-700/25',
  },
  {
    value: 'COMPLETED',
    label: 'Hoàn tất',
    className: 'bg-emerald-50 text-emerald-900 ring-emerald-700/25',
  },
  {
    value: 'CANCELLED',
    label: 'Đã hủy',
    className: 'bg-stone-100 text-stone-600 ring-stone-400/30',
  },
];

type Filter = ServiceRegistrationStatus | 'ALL';

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Asia/Ho_Chi_Minh',
});

function plain(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
}

function NoteEditor({
  registration,
  onSave,
}: {
  registration: ServiceRegistration;
  onSave: (note: string) => Promise<boolean>;
}) {
  const [note, setNote] = useState(registration.adminNote ?? '');
  const [saving, setSaving] = useState(false);
  const changed = note.trim() !== (registration.adminNote ?? '');

  return (
    <div className="grid gap-2">
      <label className="sr-only" htmlFor={`note-${registration.id}`}>
        Ghi chú cho đăng ký của {registration.fullName}
      </label>
      <textarea
        id={`note-${registration.id}`}
        rows={2}
        maxLength={1000}
        value={note}
        placeholder="Ghi chú: đã gọi lúc nào, khách hẹn gì…"
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

export function ServiceRegistrationsPanel({ initial }: { initial: ServiceRegistration[] }) {
  const confirm = useConfirm();
  const showToast = useToast();
  const [registrations, setRegistrations] = useState(initial);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const byStatus = new Map<ServiceRegistrationStatus, number>();
    for (const entry of registrations) {
      byStatus.set(entry.status, (byStatus.get(entry.status) ?? 0) + 1);
    }
    return byStatus;
  }, [registrations]);

  const shown = useMemo(() => {
    const needle = plain(query.trim());
    return registrations.filter(
      (entry) =>
        (filter === 'ALL' || entry.status === filter) &&
        (!needle ||
          plain(
            `${entry.fullName} ${entry.email} ${entry.phone} ${displayPhone(entry.phone)} ${entry.planName}`,
          ).includes(needle)),
    );
  }, [registrations, filter, query]);

  function replace(saved: ServiceRegistration): void {
    setRegistrations((current) => current.map((entry) => (entry.id === saved.id ? saved : entry)));
  }

  async function changeStatus(
    entry: ServiceRegistration,
    status: ServiceRegistrationStatus,
  ): Promise<void> {
    setBusyId(entry.id);
    try {
      replace(await updateServiceRegistration(entry.id, { status }));
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'cập nhật trạng thái') });
    } finally {
      setBusyId(null);
    }
  }

  async function saveNote(entry: ServiceRegistration, note: string): Promise<boolean> {
    try {
      replace(await updateServiceRegistration(entry.id, { adminNote: note }));
      showToast({ kind: 'success', message: 'Đã lưu ghi chú.' });
      return true;
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'lưu ghi chú') });
      return false;
    }
  }

  async function remove(entry: ServiceRegistration): Promise<void> {
    if (
      !(await confirm({
        title: `Xóa đăng ký của ${entry.fullName}?`,
        message: 'Thông tin liên hệ của người này sẽ bị xóa hẳn.',
        confirmLabel: 'Xóa',
        tone: 'danger',
      }))
    ) {
      return;
    }
    setBusyId(entry.id);
    try {
      await deleteServiceRegistration(entry.id);
      setRegistrations((current) => current.filter((item) => item.id !== entry.id));
      showToast({ kind: 'success', message: 'Đã xóa đăng ký.' });
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'xóa đăng ký') });
    } finally {
      setBusyId(null);
    }
  }

  const filterOptions = [
    { value: 'ALL' as const, label: 'Tất cả', count: registrations.length },
    ...STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
      count: counts.get(status.value) ?? 0,
    })),
  ];

  return (
    <SectionCard
      icon={<ClipboardList aria-hidden="true" />}
      title="Đăng ký dịch vụ"
      description="Người xem gửi form khi bấm nút đăng ký trên Bảng giá ở trang chủ. Đổi trạng thái khi đã liên hệ, ghi chú lại để cả nhóm cùng theo dõi."
    >
      <div className="grid gap-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <Segmented
            label="Lọc theo trạng thái"
            options={filterOptions}
            value={filter}
            onChange={setFilter}
            className="overflow-x-auto"
          />
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold-700"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              aria-label="Tìm theo tên, email, số điện thoại hoặc gói"
              placeholder="Tìm tên, email, số điện thoại…"
              onChange={(event) => setQuery(event.currentTarget.value)}
              className="h-11 w-full rounded-lg border border-gold-700/45 bg-[var(--card)] pl-10 pr-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
            />
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed border-gold-500/40 py-10 text-center text-sm text-stone-500">
            {registrations.length === 0
              ? 'Chưa có ai đăng ký. Đăng ký mới từ trang chủ sẽ hiện ở đây.'
              : 'Không có đăng ký nào khớp bộ lọc.'}
          </p>
        ) : (
          <ul className="grid gap-3">
            {shown.map((entry) => {
              const status = STATUSES.find((choice) => choice.value === entry.status);
              const noteOpen = openNoteId === entry.id;
              return (
                <li
                  key={entry.id}
                  className={cn(
                    'grid gap-3 rounded-xl border bg-white/85 p-4',
                    entry.status === 'NEW'
                      ? 'border-brand-700/30 shadow-[inset_4px_0_0_var(--color-brand-700)]'
                      : 'border-gold-500/25',
                  )}
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.4fr)_minmax(0,0.9fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-brand-950" title={entry.fullName}>
                        {entry.fullName}
                      </p>
                      <p className="text-xs text-stone-500">
                        Gửi lúc {DATE_TIME.format(new Date(entry.createdAt))}
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
                    <div className="min-w-0">
                      <span className="text-xs text-stone-500">Gói</span>
                      <p className="truncate font-medium text-wood-800">{entry.planName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <label className="sr-only" htmlFor={`status-${entry.id}`}>
                        Trạng thái đăng ký của {entry.fullName}
                      </label>
                      <select
                        id={`status-${entry.id}`}
                        value={entry.status}
                        disabled={busyId === entry.id}
                        onChange={(event) =>
                          void changeStatus(
                            entry,
                            event.currentTarget.value as ServiceRegistrationStatus,
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
                        aria-expanded={noteOpen}
                        aria-label={`Ghi chú cho ${entry.fullName}`}
                        onClick={() => setOpenNoteId(noteOpen ? null : entry.id)}
                        className={cn(entry.adminNote && 'text-brand-700')}
                      >
                        <StickyNote className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Xóa đăng ký của ${entry.fullName}`}
                        disabled={busyId !== null}
                        onClick={() => void remove(entry)}
                      >
                        {busyId === entry.id ? (
                          <InlineLoader className="size-4" />
                        ) : (
                          <Trash2 className="size-4 text-red-700" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {noteOpen ? (
                    <NoteEditor registration={entry} onSave={(note) => saveNote(entry, note)} />
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
    </SectionCard>
  );
}
