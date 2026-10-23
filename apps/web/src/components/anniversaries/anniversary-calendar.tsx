'use client';

import {
  BellRing,
  CalendarHeart,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Landmark,
  Mail,
  Moon,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

import { heroIconButtonClass, heroOverlapClass, PageHero } from '@/components/layout/page-hero';
import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { useToast } from '@/components/ui/toast';
import {
  createAnniversaryReminder,
  deleteAnniversaryReminder,
  fetchAnniversaryCalendar,
  type AnniversaryCalendar,
  type AnniversaryEntry,
  type AnniversaryReminder,
  type CreatedAnniversaryReminder,
} from '@/lib/anniversary-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { familyMediaSrc } from '@/lib/media-api';
import { cn } from '@/lib/utils';
import { mondayIndex } from '@/lib/vietnam-date';

const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const UPCOMING_COUNT = 4;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Day = { year: number; month: number; day: number };

function parseIso(iso: string): Day {
  const [year, month, day] = iso.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

function iso({ year, month, day }: Day): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function utc(isoDay: string): number {
  const { year, month, day } = parseIso(isoDay);
  return Date.UTC(year, month - 1, day);
}

function daysUntil(today: string, date: string): number {
  return Math.round((utc(date) - utc(today)) / 86_400_000);
}

function addDays(isoDay: string, days: number): string {
  return new Date(utc(isoDay) + days * 86_400_000).toISOString().slice(0, 10);
}

function weekday(isoDay: string): string {
  return WEEKDAYS[new Date(utc(isoDay)).getUTCDay()]!;
}

function shortDate(isoDay: string): string {
  const { month, day } = parseIso(isoDay);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

function countdown(days: number): string {
  if (days === 0) return 'Hôm nay';
  if (days === 1) return 'Ngày mai';
  if (days > 0) return `Còn ${days} ngày`;
  return `${-days} ngày trước`;
}

function fullName(entry: AnniversaryEntry): string {
  return entry.honorific ? `${entry.honorific} ${entry.name}` : entry.name;
}

/** The lunar day of a solar date, from the first days of the lunar months around it. */
type LunarDate = { day: number; month: number; year: number; leap: boolean };

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

/** The sexagenary name of a lunar year: 2026 → Bính Ngọ. */
function lunarYearName(year: number): string {
  return `${CAN[(year + 6) % 10]} ${CHI[(year + 8) % 12]}`;
}

function lunarLabel(lunar: LunarDate): string {
  return `${lunar.day}/${lunar.month}${lunar.leap ? ' nhuận' : ''}`;
}

function lunarDayOf(calendar: AnniversaryCalendar, isoDay: string): LunarDate | null {
  let start: AnniversaryCalendar['lunarMonths'][number] | undefined;
  for (const month of calendar.lunarMonths) {
    if (month.date <= isoDay) start = month;
    else break;
  }
  if (!start) return null;
  return {
    day: daysUntil(start.date, isoDay) + 1,
    month: start.lunarMonth,
    year: start.lunarYear,
    leap: start.leap,
  };
}

function MonthGrid({
  calendar,
  month,
  selectedDay,
  onSelectDay,
  byDay,
  familyDays,
}: {
  calendar: AnniversaryCalendar;
  month: number;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  byDay: Map<string, AnniversaryEntry[]>;
  familyDays: Set<string>;
}) {
  const year = calendar.year;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = mondayIndex(year, month - 1, 1);
  const cells: Array<string | null> = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => iso({ year, month, day: index + 1 })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="overflow-hidden rounded-xl border border-line shadow-sm">
      <div className="grid grid-cols-7 bg-wood-50">
        {WEEKDAY_HEADERS.map((label, index) => (
          <div
            key={label}
            className={cn(
              'py-2 text-center text-[11px] font-bold uppercase tracking-wider',
              index === 6 ? 'text-brand-700' : 'text-wood-500',
            )}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px border-t border-line bg-line">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`blank-${index}`} aria-hidden="true" className="bg-wood-50/60" />;
          }
          const entries = byDay.get(day) ?? [];
          const lunar = lunarDayOf(calendar, day);
          const isToday = day === calendar.today;
          const isPast = day < calendar.today;
          const isFamilyDay = familyDays.has(day);
          const selected = day === selectedDay;
          const isSunday = index % 7 === 6;
          const chips = isFamilyDay ? 1 : 2;
          const label = [
            `${isToday ? 'Hôm nay, ' : ''}${weekday(day)} ${shortDate(day)} dương lịch`,
            lunar ? `âm lịch ${lunarLabel(lunar)}` : '',
            isPast ? 'đã qua' : '',
            isFamilyDay ? 'giỗ họ' : '',
            entries.length ? `${entries.length} ngày giỗ: ${entries.map(fullName).join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(', ');
          const lunarMark = lunar && (lunar.day === 1 || lunar.day === 15);
          return (
            <button
              key={day}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              title={label}
              onClick={() => onSelectDay(selected ? null : day)}
              className={cn(
                'relative flex min-h-16 flex-col gap-1 p-1.5 text-left outline-none transition sm:min-h-24 sm:p-2',
                'focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500',
                isToday
                  ? 'bg-gold-100 shadow-[inset_0_3px_0_var(--color-brand-700)] hover:bg-gold-200/70'
                  : isPast
                    ? 'bg-[#f3efe8] hover:bg-[#ebe5db]'
                    : 'bg-white hover:bg-gold-50',
                selected && 'z-10 ring-2 ring-inset ring-brand-600',
              )}
            >
              <span className="flex w-full items-start justify-between gap-1">
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-sm tabular-nums',
                    isToday
                      ? 'bg-brand-700 font-bold text-white shadow-md shadow-brand-900/25'
                      : isPast
                        ? 'font-medium text-stone-400'
                        : isSunday
                          ? 'font-semibold text-brand-700'
                          : 'font-semibold text-wood-900',
                  )}
                >
                  {parseIso(day).day}
                </span>
                {lunar ? (
                  <span
                    className={cn(
                      'mt-1 whitespace-nowrap text-[10px] tabular-nums leading-none sm:text-[11px]',
                      'rounded-full px-1.5 py-0.5 font-semibold text-gold-800',
                      lunarMark ? 'bg-gold-500/30' : 'bg-gold-500/15',
                      isPast && 'opacity-55',
                    )}
                  >
                    {`${lunar.day}/${lunar.month}${lunar.leap ? 'N' : ''}`}
                  </span>
                ) : null}
              </span>
              {isToday ? (
                <span className="hidden w-fit rounded-full bg-brand-700/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 sm:block">
                  Hôm nay
                </span>
              ) : null}
              {entries.length > 0 || isFamilyDay ? (
                <span className="mt-auto flex w-full flex-col gap-0.5">
                  {isFamilyDay ? (
                    <span
                      className={cn(
                        'hidden items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold sm:flex',
                        isPast ? 'bg-stone-200 text-stone-500' : 'bg-gold-500 text-white',
                      )}
                    >
                      <Landmark className="size-3 shrink-0" aria-hidden="true" />
                      Giỗ họ
                    </span>
                  ) : null}
                  {entries.slice(0, chips).map((entry) => (
                    <span
                      key={entry.personId}
                      className={cn(
                        'hidden items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium sm:flex',
                        isPast ? 'bg-stone-200 text-stone-500' : 'bg-brand-700 text-white',
                      )}
                    >
                      <Flame className="size-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{entry.name}</span>
                    </span>
                  ))}
                  {entries.length > chips ? (
                    <span
                      className={cn(
                        'hidden text-[11px] font-semibold sm:block',
                        isPast ? 'text-stone-400' : 'text-brand-700',
                      )}
                    >
                      +{entries.length - chips} người
                    </span>
                  ) : null}
                  <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden="true">
                    {isFamilyDay ? (
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          isPast ? 'bg-stone-300' : 'bg-gold-500',
                        )}
                      />
                    ) : null}
                    {entries.slice(0, 3).map((entry) => (
                      <span
                        key={entry.personId}
                        className={cn(
                          'size-1.5 rounded-full',
                          isPast ? 'bg-stone-300' : 'bg-brand-700',
                        )}
                      />
                    ))}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  today,
  reminded,
  onOpen,
}: {
  entry: AnniversaryEntry;
  today: string;
  reminded: boolean;
  onOpen: () => void;
}) {
  const days = daysUntil(today, entry.date);
  return (
    <li className="flex items-center gap-2 py-1 pr-2 sm:pr-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-gold-50 sm:px-4"
      >
        <span className="grid w-14 shrink-0 place-items-center rounded-lg border border-brand-100 bg-brand-50 py-1.5 text-brand-800">
          <span className="text-lg font-bold leading-none tabular-nums">
            {shortDate(entry.date)}
          </span>
          <span className="mt-0.5 text-[11px] text-brand-700/80">{weekday(entry.date)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold text-stone-900">{fullName(entry)}</span>
            {days < 0 ? (
              <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-600">
                Đã qua
              </span>
            ) : days <= 30 ? (
              <span
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                  days <= 7 ? 'bg-brand-700 text-white' : 'bg-gold-100 text-gold-900',
                )}
              >
                {countdown(days)}
              </span>
            ) : null}
          </span>
          <span className="block text-sm text-stone-600">
            Giỗ {entry.lunarDay}/{entry.lunarMonth} âm lịch
            {entry.anniversaryNumber ? ` · lần thứ ${entry.anniversaryNumber}` : ''}
            {entry.generation ? ` · đời ${entry.generation}` : ''}
          </span>
        </span>
      </button>
      {reminded ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100"
          aria-label={`Đã đặt nhắc giỗ ${fullName(entry)}, xem hoặc thay đổi`}
        >
          <BellRing className="size-4" aria-hidden="true" />
          <span className="sm:hidden">Đã nhắc</span>
          <span className="hidden sm:inline">Đã đặt nhắc</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="shrink-0"
          aria-label={`Nhắc giỗ ${fullName(entry)} qua email`}
        >
          <BellRing className="size-4" aria-hidden="true" />
          <span className="sm:hidden">Nhắc</span>
          <span className="hidden sm:inline">Nhắc giỗ</span>
        </Button>
      )}
    </li>
  );
}

function ReminderDialog({
  familySlug,
  entry,
  today,
  reminders,
  defaultEmail,
  mailEnabled,
  onClose,
  onCreated,
  onDeleted,
}: {
  familySlug: string;
  entry: AnniversaryEntry;
  today: string;
  reminders: AnniversaryReminder[];
  defaultEmail: string;
  mailEnabled: boolean;
  onClose: () => void;
  onCreated: (reminder: AnniversaryReminder) => void;
  onDeleted: (reminderId: string) => void;
}) {
  const showToast = useToast();
  const [email, setEmail] = useState(defaultEmail);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<CreatedAnniversaryReminder | null>(null);
  const days = daysUntil(today, entry.date);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError('Hãy nhập một địa chỉ email hợp lệ, ví dụ ten@gmail.com.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const reminder = await createAnniversaryReminder(familySlug, {
        personId: entry.personId,
        email: value,
      });
      onCreated({ id: reminder.id, personId: reminder.personId, email: reminder.email });
      setSaved(reminder);
    } catch (caught: unknown) {
      setError(getApiErrorMessage(caught, 'đặt nhắc lịch giỗ'));
    } finally {
      setSaving(false);
    }
  }

  async function remove(reminder: AnniversaryReminder): Promise<void> {
    setRemovingId(reminder.id);
    try {
      await deleteAnniversaryReminder(familySlug, reminder.id);
      onDeleted(reminder.id);
      showToast({ kind: 'success', message: `Đã hủy nhắc gửi tới ${reminder.email}.` });
    } catch (caught: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(caught, 'hủy nhắc lịch giỗ') });
    } finally {
      setRemovingId(null);
    }
  }

  if (saved) {
    const nextDate = addDays(today, saved.daysLeft);
    return (
      <SheetDialog
        title="Đã đặt nhắc"
        onClose={onClose}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSaved(null);
                setEmail('');
              }}
            >
              Thêm email khác
            </Button>
            <Button type="button" onClick={onClose}>
              Xong
            </Button>
          </>
        }
      >
        <div role="status" className="grid justify-items-center gap-4 py-2 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50">
            <CheckCircle2 className="size-9" aria-hidden="true" />
          </span>
          <div className="grid gap-1">
            <p className="font-display text-xl font-bold text-brand-900">Đặt nhắc thành công</p>
            <p className="text-sm text-stone-600">
              Giỗ <strong className="text-stone-900">{fullName(entry)}</strong> · {entry.lunarDay}/
              {entry.lunarMonth} âm lịch
            </p>
          </div>
          <div className="grid w-full gap-2 rounded-2xl border border-gold-200 bg-gold-50/60 p-4 text-left text-sm text-stone-700">
            <p className="flex items-start gap-2">
              <Mail className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
              <span>
                Gửi tới <strong className="break-all text-stone-900">{saved.email}</strong>
              </span>
            </p>
            <p className="flex items-start gap-2">
              <BellRing className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />
              <span>
                {saved.sentNow
                  ? `${saved.daysLeft === 0 ? 'Hôm nay là ngày giỗ' : `Còn ${saved.daysLeft} ngày nữa là đến ngày giỗ`}, nên email nhắc đã được gửi ngay. Hãy kiểm tra hộp thư (cả mục Spam).`
                  : `Mỗi năm, email nhắc sẽ được gửi trước ngày giỗ 1 tuần. Lần tới: ${shortDate(nextDate)}/${parseIso(nextDate).year} (${weekday(nextDate)}).`}
              </span>
            </p>
            {saved.sentNow ? (
              <p className="flex items-start gap-2">
                <CalendarHeart
                  className="mt-0.5 size-4 shrink-0 text-brand-700"
                  aria-hidden="true"
                />
                <span>Từ năm sau, email nhắc sẽ đến trước ngày giỗ 1 tuần.</span>
              </p>
            ) : null}
          </div>
          <p className="text-xs text-stone-500">
            Muốn ngừng nhận, bấm “Hủy nhắc” trong email hoặc mở lại ngày giỗ này.
          </p>
        </div>
      </SheetDialog>
    );
  }

  return (
    <SheetDialog title="Ngày giỗ" onClose={onClose} busy={saving}>
      <div className="grid gap-5">
        <div className="flex items-center gap-4">
          {entry.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={familyMediaSrc(familySlug, entry.avatarUrl)}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-2 ring-gold-300"
            />
          ) : (
            <PersonAvatar
              gender={entry.gender}
              generation={entry.generation}
              className="size-16 shrink-0 rounded-full ring-2 ring-gold-300"
            />
          )}
          <div className="min-w-0">
            <p className="font-display text-xl font-bold leading-tight text-brand-900">
              {fullName(entry)}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {entry.generation ? `Đời thứ ${entry.generation}` : 'Thành viên dòng họ'}
              {entry.anniversaryNumber ? ` · Giỗ lần thứ ${entry.anniversaryNumber}` : ''}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-gold-200 bg-gold-50/60 p-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gold-800">Âm lịch</dt>
            <dd className="mt-1 text-lg font-bold text-stone-900">
              {entry.lunarDay}/{entry.lunarMonth}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gold-800">
              Dương lịch
            </dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-stone-900">
              {shortDate(entry.date)}/{parseIso(entry.date).year}
            </dd>
            <dd className="text-sm text-stone-600">{weekday(entry.date)}</dd>
          </div>
          <div className="col-span-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Flame className="size-4" aria-hidden="true" />
            {days >= 0
              ? countdown(days)
              : `Ngày giỗ năm nay đã qua ${-days} ngày; đặt nhắc sẽ nhắc từ năm sau.`}
          </div>
        </dl>

        <section className="grid gap-3" aria-labelledby="reminder-title">
          <h3 id="reminder-title" className="flex items-center gap-2 font-semibold text-stone-900">
            <BellRing className="size-4 text-brand-700" aria-hidden="true" />
            Nhắc tôi qua email
          </h3>
          {reminders.length > 0 ? (
            <ul className="grid gap-2">
              {reminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                >
                  <Mail className="size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    Đã đặt lịch nhắc tới <strong>{reminder.email}</strong>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void remove(reminder)}
                    disabled={removingId === reminder.id}
                    aria-label={`Hủy nhắc gửi tới ${reminder.email}`}
                  >
                    {removingId === reminder.id ? (
                      <InlineLoader className="size-4" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                    Hủy
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {mailEnabled ? (
            <form className="grid gap-2" onSubmit={(event) => void submit(event)} noValidate>
              <label htmlFor="reminder-email" className="text-sm text-stone-700">
                {reminders.length > 0
                  ? 'Thêm một email khác cũng muốn nhận lịch nhắc:'
                  : 'Nhập email, chúng tôi sẽ gửi thư nhắc trước ngày giỗ 1 tuần hàng năm'}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="reminder-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="ten@gmail.com"
                  value={email}
                  onChange={(event) => setEmail(event.currentTarget.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'reminder-error' : undefined}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-base outline-none transition placeholder:text-stone-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
                />
                <Button type="submit" disabled={saving} className="h-11">
                  {saving ? (
                    <InlineLoader className="size-4" />
                  ) : (
                    <BellRing className="size-4" aria-hidden="true" />
                  )}
                  Nhắc tôi
                </Button>
              </div>
              {error ? (
                <p id="reminder-error" role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
              Hệ thống chưa bật gửi email nên chưa đặt nhắc được. Vui lòng báo trưởng họ hoặc quản
              trị viên.
            </p>
          )}
        </section>
      </div>
    </SheetDialog>
  );
}

/** Lịch giỗ: the family's death anniversaries for a year, with email reminders. */
export function AnniversaryCalendarView({
  familySlug,
  initial,
}: {
  familySlug: string;
  initial: AnniversaryCalendar;
}) {
  const showToast = useToast();
  const [calendar, setCalendar] = useState(initial);
  const [reminders, setReminders] = useState(initial.reminders);
  const [month, setMonth] = useState(() => parseIso(initial.today).month);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [openEntry, setOpenEntry] = useState<AnniversaryEntry | null>(null);
  const [loadingYear, setLoadingYear] = useState<number | null>(null);
  const [lastEmail, setLastEmail] = useState(initial.accountEmail ?? '');

  const remindedIds = useMemo(
    () => new Set(reminders.map((reminder) => reminder.personId)),
    [reminders],
  );
  const byDay = useMemo(() => {
    const map = new Map<string, AnniversaryEntry[]>();
    for (const entry of calendar.anniversaries) {
      map.set(entry.date, [...(map.get(entry.date) ?? []), entry]);
    }
    return map;
  }, [calendar.anniversaries]);
  const familyDays = useMemo(
    () => new Set(calendar.familyAnniversary?.dates ?? []),
    [calendar.familyAnniversary],
  );
  const upcoming = useMemo(
    () =>
      calendar.anniversaries
        .filter((entry) => daysUntil(calendar.today, entry.date) >= 0)
        .slice(0, UPCOMING_COUNT),
    [calendar],
  );
  const monthPrefix = `${calendar.year}-${String(month).padStart(2, '0')}`;
  const search = query.trim().toLocaleLowerCase('vi');
  const listed = search
    ? calendar.anniversaries.filter((entry) =>
        fullName(entry).toLocaleLowerCase('vi').includes(search),
      )
    : selectedDay
      ? (byDay.get(selectedDay) ?? [])
      : calendar.anniversaries.filter((entry) => entry.date.startsWith(monthPrefix));
  const familyInMonth = calendar.familyAnniversary?.dates.filter((date) =>
    selectedDay ? date === selectedDay : date.startsWith(monthPrefix),
  );
  const isCurrentYear = parseIso(calendar.today).year === calendar.year;

  async function loadYear(year: number, nextMonth: number): Promise<void> {
    setLoadingYear(year);
    try {
      const next = await fetchAnniversaryCalendar(familySlug, year);
      setCalendar(next);
      setReminders(next.reminders);
      setMonth(nextMonth);
      setSelectedDay(null);
    } catch (error: unknown) {
      showToast({ kind: 'error', message: getApiErrorMessage(error, 'tải lịch giỗ') });
    } finally {
      setLoadingYear(null);
    }
  }

  function shiftMonth(offset: number): void {
    const target = month + offset;
    if (target < 1) void loadYear(calendar.year - 1, 12);
    else if (target > 12) void loadYear(calendar.year + 1, 1);
    else {
      setMonth(target);
      setSelectedDay(null);
    }
  }

  function goToToday(): void {
    const today = parseIso(calendar.today);
    if (today.year !== calendar.year) void loadYear(today.year, today.month);
    else {
      setMonth(today.month);
      setSelectedDay(null);
    }
  }

  const firstLunar = lunarDayOf(calendar, iso({ year: calendar.year, month, day: 1 }));
  const lastLunar = lunarDayOf(
    calendar,
    iso({
      year: calendar.year,
      month,
      day: new Date(Date.UTC(calendar.year, month, 0)).getUTCDate(),
    }),
  );
  const lunarRange =
    firstLunar && lastLunar
      ? `${lunarLabel(firstLunar)} – ${lunarLabel(lastLunar)} năm ${
          firstLunar.year === lastLunar.year
            ? lunarYearName(lastLunar.year)
            : `${lunarYearName(firstLunar.year)} – ${lunarYearName(lastLunar.year)}`
        }`
      : null;
  const selectedLunar = selectedDay ? lunarDayOf(calendar, selectedDay) : null;

  const listTitle = search
    ? `Kết quả cho “${query.trim()}” trong năm ${calendar.year}`
    : selectedDay
      ? `${selectedDay === calendar.today ? 'Hôm nay, ' : ''}${weekday(selectedDay)} ${shortDate(selectedDay)}/${calendar.year}${selectedLunar ? ` · âm lịch ${lunarLabel(selectedLunar)}` : ''}`
      : `Các ngày giỗ trong tháng ${month}/${calendar.year}`;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-3 pb-6 sm:gap-4 sm:px-4 sm:py-6 lg:max-w-5xl lg:px-8 lg:py-8">
      <PageHero
        title="Lịch giỗ"
        icon={CalendarHeart}
        overlap
        description={`Ngày giỗ của các cụ, ông bà trong ${calendar.familyName}, theo âm lịch và đổi sang dương lịch. Bấm vào một ngày giỗ để đặt nhắc qua email.`}
      />

      <section
        aria-labelledby="upcoming-title"
        className={cn('surface grid gap-3 p-4 sm:p-5', heroOverlapClass)}
      >
        <h2 id="upcoming-title" className="flex items-center gap-2 font-semibold text-stone-900">
          <Flame className="size-4 text-brand-700" aria-hidden="true" />
          {isCurrentYear ? 'Sắp tới' : `Đầu năm ${calendar.year}`}
        </h2>
        {upcoming.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((entry) => {
              const days = daysUntil(calendar.today, entry.date);
              return (
                <li key={`${entry.personId}-${entry.date}`}>
                  <button
                    type="button"
                    onClick={() => setOpenEntry(entry)}
                    className="flex w-full items-center gap-3 rounded-xl border border-gold-200 bg-white p-3 text-left shadow-sm transition hover:border-brand-300 hover:shadow"
                  >
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
                      <span className="text-lg font-bold leading-none tabular-nums">
                        {parseIso(entry.date).day}
                      </span>
                      <span className="text-[11px] opacity-85">
                        Th {parseIso(entry.date).month}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-stone-900">
                        {fullName(entry)}
                      </span>
                      <span className="block text-sm text-stone-600">
                        {weekday(entry.date)} · {entry.lunarDay}/{entry.lunarMonth} âm lịch
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-semibold',
                            days <= 7 ? 'bg-brand-100 text-brand-800' : 'bg-gold-100 text-gold-900',
                          )}
                        >
                          {countdown(days)}
                        </span>
                        {remindedIds.has(entry.personId) ? (
                          <BellRing
                            className="size-3.5 text-emerald-700"
                            aria-label="Đã đặt nhắc"
                          />
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-stone-600">
            {calendar.anniversaries.length === 0
              ? 'Chưa có ngày giỗ nào. Ngày giỗ được lấy từ thông tin “Ngày giỗ (âm lịch)” của từng người trong gia phả.'
              : `Không còn ngày giỗ nào từ nay đến hết năm ${calendar.year}.`}
          </p>
        )}
      </section>

      <section aria-labelledby="calendar-title" className="surface mx-3 overflow-hidden sm:mx-0">
        <div className="heritage-hero relative isolate flex flex-wrap items-center gap-x-4 gap-y-3 border-x-0 border-t-0 px-4 py-4 text-white sm:px-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={heroIconButtonClass}
              onClick={() => shiftMonth(-1)}
              disabled={loadingYear !== null}
              aria-label="Tháng trước"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <h2 id="calendar-title" className="min-w-36 text-center" aria-live="polite">
              {loadingYear !== null ? (
                <InlineLoader className="mx-auto size-6" />
              ) : (
                <>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-200">
                    Dương lịch
                  </span>
                  <span className="block font-display text-2xl font-bold leading-tight">
                    Tháng {month}/{calendar.year}
                  </span>
                </>
              )}
            </h2>
            <button
              type="button"
              className={heroIconButtonClass}
              onClick={() => shiftMonth(1)}
              disabled={loadingYear !== null}
              aria-label="Tháng sau"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="grid gap-1.5">
            {lunarRange ? (
              <p className="flex items-center gap-1.5 text-sm text-gold-100">
                <Moon className="size-4 shrink-0 text-gold-300" aria-hidden="true" />
                <span>
                  Âm lịch: <strong className="text-white">{lunarRange}</strong>
                </span>
              </p>
            ) : null}
            <button
              type="button"
              onClick={goToToday}
              disabled={loadingYear !== null}
              className="w-fit rounded-full border border-gold-300/40 bg-white/10 px-3 py-1 text-xs font-semibold text-gold-50 transition hover:bg-white/20 disabled:opacity-60"
            >
              Về hôm nay
            </button>
          </div>
          <label className="relative w-full sm:ml-auto sm:w-60">
            <span className="sr-only">Tìm theo tên</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold-100/80"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Tìm theo tên…"
              className="h-10 w-full rounded-full border border-gold-300/40 bg-white/10 pl-9 pr-9 text-base text-white outline-none transition placeholder:text-gold-100/70 focus:border-gold-200 focus:bg-white/15 focus:ring-2 focus:ring-gold-200/30 sm:text-sm"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-gold-100 hover:bg-white/15"
                aria-label="Xóa tìm kiếm"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
        </div>

        <div className="grid gap-4 p-3 sm:p-5">
          {search ? null : (
            <>
              <MonthGrid
                calendar={calendar}
                month={month}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                byDay={byDay}
                familyDays={familyDays}
              />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 rounded-xl bg-wood-50/80 px-3 py-2.5 text-xs text-wood-700">
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-14 shrink-0 items-start justify-between gap-1 rounded-md border border-line bg-white px-1.5 py-1"
                  >
                    <span className="text-sm font-semibold leading-none text-wood-900">26</span>
                    <span className="rounded-full bg-gold-500/15 px-1 py-px text-[9px] font-semibold leading-none text-gold-800">
                      10/9
                    </span>
                  </span>
                  <span className="leading-5">
                    Số lớn: <strong className="text-wood-900">dương lịch</strong> · số nhỏ:{' '}
                    <strong className="text-gold-800">âm lịch</strong>
                    <span className="text-wood-500">
                      {' '}
                      dạng ngày/tháng (10/9 = mùng 10 tháng 9 âm)
                    </span>
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-4 rounded bg-gold-100 shadow-[inset_0_2px_0_var(--color-brand-700)] ring-1 ring-line"
                  />
                  Hôm nay
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-4 rounded bg-[#f3efe8] ring-1 ring-line"
                  />
                  Đã qua
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="grid size-4 place-items-center rounded bg-brand-700 text-white"
                  >
                    <Flame className="size-2.5" />
                  </span>
                  Ngày giỗ
                </span>
                {calendar.familyAnniversary ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="grid size-4 place-items-center rounded bg-gold-500 text-white"
                    >
                      <Landmark className="size-2.5" />
                    </span>
                    Giỗ họ ({calendar.familyAnniversary.lunarDay}/
                    {calendar.familyAnniversary.lunarMonth} âm lịch)
                  </span>
                ) : null}
              </div>
            </>
          )}

          <div className="grid gap-2 border-t border-gold-100 pt-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="font-semibold text-stone-900">{listTitle}</h3>
              {selectedDay && !search ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDay(null)}
                >
                  Cả tháng
                </Button>
              ) : null}
            </div>
            {!search && familyInMonth?.length ? (
              <p className="flex items-center gap-2 rounded-xl border border-gold-300 bg-gold-50 px-3 py-2.5 text-sm text-gold-900">
                <Landmark className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  <strong>Giỗ họ</strong> ngày{' '}
                  {familyInMonth.map((date) => `${shortDate(date)} (${weekday(date)})`).join(', ')}{' '}
                  – {calendar.familyAnniversary!.lunarDay}/{calendar.familyAnniversary!.lunarMonth}{' '}
                  âm lịch.
                </span>
              </p>
            ) : null}
            {listed.length > 0 ? (
              <ul className="grid divide-y divide-gold-100">
                {listed.map((entry) => (
                  <EntryRow
                    key={`${entry.personId}-${entry.date}`}
                    entry={entry}
                    today={calendar.today}
                    reminded={remindedIds.has(entry.personId)}
                    onOpen={() => setOpenEntry(entry)}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-1 py-4 text-center text-sm text-stone-500">
                {search
                  ? 'Không tìm thấy ai có ngày giỗ khớp với tên này.'
                  : selectedDay
                    ? 'Ngày này không có ngày giỗ.'
                    : 'Tháng này không có ngày giỗ.'}
              </p>
            )}
          </div>
        </div>
      </section>

      {openEntry ? (
        <ReminderDialog
          familySlug={familySlug}
          entry={openEntry}
          today={calendar.today}
          reminders={reminders.filter((reminder) => reminder.personId === openEntry.personId)}
          defaultEmail={lastEmail}
          mailEnabled={calendar.mailEnabled}
          onClose={() => setOpenEntry(null)}
          onCreated={(reminder) => {
            setLastEmail(reminder.email);
            setReminders((current) =>
              current.some((item) => item.id === reminder.id) ? current : [...current, reminder],
            );
          }}
          onDeleted={(reminderId) =>
            setReminders((current) => current.filter((item) => item.id !== reminderId))
          }
        />
      ) : null}
    </div>
  );
}
