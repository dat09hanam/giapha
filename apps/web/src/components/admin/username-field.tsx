'use client';

import { useEffect, useState, type ComponentProps } from 'react';

import { checkUsernameAvailable } from '@/lib/family-accounts-api';
import { cn } from '@/lib/utils';

export type UsernameStatus = 'empty' | 'invalid' | 'checking' | 'free' | 'taken' | 'unknown';

const PREFIX_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.@-]*$/;
const PREFIX_MIN_LENGTH = 3;
export const PREFIX_MAX_LENGTH = 60;
const CHECK_DELAY_MS = 350;

export function useUsernameCheck(familySlug: string, prefix: string): UsernameStatus {
  const typed = prefix.trim();
  const checkable =
    typed.length >= PREFIX_MIN_LENGTH &&
    typed.length <= PREFIX_MAX_LENGTH &&
    PREFIX_PATTERN.test(typed);
  const [answer, setAnswer] = useState<{ prefix: string; available: boolean | null } | null>(null);

  useEffect(() => {
    if (!checkable) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkUsernameAvailable(familySlug, typed, controller.signal)
        .then(({ available }) => setAnswer({ prefix: typed, available }))
        .catch(() => {
          if (!controller.signal.aborted) setAnswer({ prefix: typed, available: null });
        });
    }, CHECK_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [checkable, familySlug, typed]);

  if (!typed) return 'empty';
  if (!checkable) return 'invalid';
  if (answer?.prefix !== typed) return 'checking';
  if (answer.available === null) return 'unknown';
  return answer.available ? 'free' : 'taken';
}

function statusMessage(status: UsernameStatus, username: string, suffix: string): string {
  switch (status) {
    case 'empty':
      return `Chữ không dấu, số và các ký tự . _ @ -. Hệ thống tự thêm "${suffix}" vào sau.`;
    case 'invalid':
      return `Từ ${PREFIX_MIN_LENGTH} đến ${PREFIX_MAX_LENGTH} ký tự, bắt đầu bằng chữ hoặc số; chỉ dùng chữ không dấu, số và . _ @ -`;
    case 'checking':
      return `Đang kiểm tra ${username}…`;
    case 'free':
      return `Tên đăng nhập ${username} dùng được.`;
    case 'taken':
      return `Tên đăng nhập ${username} đã có người dùng. Hãy chọn tên khác.`;
    case 'unknown':
      return `Chưa kiểm tra được ${username}; hệ thống sẽ kiểm tra lại khi tạo.`;
  }
}

export function UsernameField({
  id,
  label,
  suffix,
  status,
  value,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value'> & {
  id: string;
  label: string;
  suffix: string;
  status: UsernameStatus;
  value: string;
}) {
  const statusId = `${id}-status`;
  return (
    <div className="grid gap-1.5" data-field="">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        {label}
      </label>
      <div
        className={cn(
          'flex h-11 w-full overflow-hidden rounded-lg border border-gold-700/45 bg-[var(--card)] transition focus-within:border-brand-700 focus-within:ring-2 focus-within:ring-brand-700/15',
          status === 'free' && 'border-2 border-emerald-600!',
          status === 'taken' && 'border-2 border-red-600!',
          className,
        )}
      >
        <input
          id={id}
          value={value}
          aria-describedby={statusId}
          aria-invalid={status === 'taken' || status === 'invalid'}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-stone-400 sm:text-sm"
          {...props}
        />
        <span
          className="flex max-w-[55%] shrink-0 items-center truncate border-l border-gold-700/30 bg-gold-50/70 px-3 font-mono text-sm text-stone-600"
          title={suffix}
        >
          {suffix}
        </span>
      </div>
      <span data-field-error="" aria-live="polite" />
      <span
        id={statusId}
        aria-live="polite"
        className={cn(
          'break-all text-xs',
          status === 'free' && 'text-emerald-700',
          status === 'taken' && 'font-medium text-red-700',
          status !== 'free' && status !== 'taken' && 'text-stone-500',
        )}
      >
        {statusMessage(status, `${value.trim()}${suffix}`, suffix)}
      </span>
    </div>
  );
}
