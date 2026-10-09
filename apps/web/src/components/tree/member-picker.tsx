'use client';

import { Check, Search, UserRoundSearch, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';
import { foldVietnamese } from '@/lib/person-search';
import { cn } from '@/lib/utils';

import type { DesignerMember } from './designer-model';

function memberName(member: DesignerMember): string {
  return member.name.trim() || 'Chưa đặt tên';
}

function MemberPickerDialog({
  title,
  members,
  value,
  onPick,
  onClose,
}: {
  title: string;
  members: readonly DesignerMember[];
  value: string;
  onPick: (memberId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const words = foldVietnamese(query).split(' ').filter(Boolean);
    if (words.length === 0) return members;
    return members.filter((member) => {
      const name = foldVietnamese(`${member.honorific} ${member.name} ${member.nickname}`);
      return words.every((word) => name.includes(word));
    });
  }, [members, query]);

  return (
    <SheetDialog title={title} onClose={onClose}>
      <label className="relative block">
        <span className="sr-only">Tìm theo tên</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400"
          aria-hidden="true"
        />
        <input
          type="search"
          // The list is long; typing a name is the quickest way in.
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Tìm theo tên, không cần dấu..."
          className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm"
        />
      </label>

      {matches.length === 0 ? (
        <p className="py-6 text-center text-sm text-stone-500">Không có thành viên nào khớp.</p>
      ) : (
        <ul className="-mx-1 grid max-h-[50dvh] gap-1 overflow-y-auto px-1">
          {matches.map((member) => {
            const selected = member.id === value;
            return (
              <li key={member.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(member.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition',
                    selected
                      ? 'border-brand-700 bg-brand-50'
                      : 'border-transparent hover:bg-gold-50',
                  )}
                >
                  <span className="grid min-w-0 flex-1">
                    <span className="truncate text-sm font-semibold text-brand-950">
                      {member.honorific ? `${member.honorific} ` : ''}
                      {memberName(member)}
                    </span>
                    <span className="text-xs text-stone-500">Đời thứ {member.generation}</span>
                  </span>
                  {selected ? (
                    <Check className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </SheetDialog>
  );
}

/**
 * Picks one member of the draft, e.g. who keeps a death anniversary: a field
 * that opens a searchable list. `value` is a member id, or '' for nobody.
 */
export function MemberPicker({
  id,
  label,
  members,
  value,
  onChange,
  placeholder = 'Chọn thành viên trong họ',
}: {
  id: string;
  label: string;
  members: readonly DesignerMember[];
  value: string;
  onChange: (memberId: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const chosen = members.find((member) => member.id === value) ?? null;

  function close(): void {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-brand-950" htmlFor={id}>
        {label}
      </label>
      <span className="relative block">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 text-left text-base outline-none transition focus:border-brand-700 focus:ring-2 focus:ring-brand-700/15 sm:text-sm',
            chosen && 'pr-10',
          )}
        >
          <span className={cn('truncate', chosen ? 'text-stone-900' : 'text-stone-400')}>
            {chosen ? `${memberName(chosen)} · đời ${chosen.generation}` : placeholder}
          </span>
          {chosen ? null : (
            <UserRoundSearch className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
          )}
        </button>
        {chosen ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label={`Bỏ chọn ${label.toLowerCase()}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </span>

      <Presence>
        {open ? (
          <MemberPickerDialog
            title={label}
            members={members}
            value={value}
            onPick={(memberId) => {
              onChange(memberId);
              close();
            }}
            onClose={close}
          />
        ) : null}
      </Presence>
    </div>
  );
}
