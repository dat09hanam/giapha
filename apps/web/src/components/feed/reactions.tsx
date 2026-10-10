'use client';

import { ThumbsUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { REACTION_BY_TYPE, REACTIONS } from '@/components/feed/feed-format';
import type { FeedReactionSummary, FeedReactionType } from '@/lib/feed-api';
import { cn } from '@/lib/utils';

const LONG_PRESS_MS = 450;
const HOVER_OPEN_MS = 550;
const HOVER_CLOSE_MS = 300;

export function applyReaction(
  summary: FeedReactionSummary,
  next: FeedReactionType | null,
  viewerName: string,
): FeedReactionSummary {
  const counts = { ...summary.counts };
  let total = summary.total;
  let names = [...summary.names];
  if (summary.mine) {
    const left = (counts[summary.mine] ?? 1) - 1;
    if (left > 0) counts[summary.mine] = left;
    else delete counts[summary.mine];
    total -= 1;
    const index = names.indexOf(viewerName);
    if (index >= 0) names.splice(index, 1);
  }
  if (next) {
    counts[next] = (counts[next] ?? 0) + 1;
    total += 1;
    names = [viewerName, ...names];
  }
  return { counts, total, mine: next, names: names.slice(0, 3) };
}

export function ReactionIcons({
  summary,
  max = 3,
  className,
}: {
  summary: FeedReactionSummary;
  max?: number;
  className?: string;
}) {
  const top = REACTIONS.filter((reaction) => summary.counts[reaction.type])
    .sort((a, b) => (summary.counts[b.type] ?? 0) - (summary.counts[a.type] ?? 0))
    .slice(0, max);
  return (
    <span className={cn('flex -space-x-1', className)} aria-hidden="true">
      {top.map((reaction) => (
        <span
          key={reaction.type}
          className="grid size-[18px] place-items-center rounded-full bg-white text-[13px] leading-none ring-2 ring-white"
        >
          {reaction.emoji}
        </span>
      ))}
    </span>
  );
}

export function reactionNamesText(summary: FeedReactionSummary): string {
  const [first] = summary.names;
  if (!first) return String(summary.total);
  return summary.total > 1 ? `${first} và ${summary.total - 1} người khác` : first;
}

export function ReactionButton({
  mine,
  onChange,
  variant,
}: {
  mine: FeedReactionType | null;
  onChange: (next: FeedReactionType | null) => void;
  variant: 'post' | 'comment';
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const hoverTimer = useRef<number | null>(null);
  const openedByPress = useRef(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const chosen = mine ? REACTION_BY_TYPE[mine] : null;

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (event: PointerEvent): void => {
      if (!wrapperRef.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [pickerOpen]);

  useEffect(
    () => () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
      if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  function clearHoverTimer(): void {
    if (hoverTimer.current) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  }

  function clearPress(): void {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  function pick(type: FeedReactionType): void {
    setPickerOpen(false);
    onChange(mine === type ? null : type);
  }

  return (
    <span
      ref={wrapperRef}
      className={cn('relative', variant === 'post' ? 'flex flex-1' : 'inline-flex')}
      onMouseEnter={() => {
        if (!matchMedia('(hover: hover)').matches) return;
        clearHoverTimer();
        if (!pickerOpen) {
          hoverTimer.current = window.setTimeout(() => setPickerOpen(true), HOVER_OPEN_MS);
        }
      }}
      onMouseLeave={() => {
        if (!matchMedia('(hover: hover)').matches) return;
        clearHoverTimer();
        if (pickerOpen) {
          hoverTimer.current = window.setTimeout(() => setPickerOpen(false), HOVER_CLOSE_MS);
        }
      }}
    >
      {pickerOpen ? (
        <span
          className={cn(
            'absolute bottom-full z-30 pb-2',
            variant === 'post' ? 'left-1' : '-left-2',
          )}
        >
          <span
            role="menu"
            aria-label="Chọn cảm xúc"
            className="ui-dialog flex gap-0.5 rounded-full border border-stone-200 bg-white px-1.5 py-1 shadow-xl"
          >
            {REACTIONS.map((reaction, index) => (
              <button
                key={reaction.type}
                type="button"
                role="menuitem"
                title={reaction.label}
                aria-label={reaction.label}
                onClick={() => pick(reaction.type)}
                style={{ animationDelay: `${index * 25}ms` }}
                className={cn(
                  'ui-dialog grid size-10 origin-bottom place-items-center rounded-full text-[28px] leading-none transition-transform duration-150 hover:-translate-y-1 hover:scale-125 sm:size-11 sm:text-[30px]',
                  mine === reaction.type && 'bg-stone-100',
                )}
              >
                {reaction.emoji}
              </button>
            ))}
          </span>
        </span>
      ) : null}

      <button
        type="button"
        aria-pressed={Boolean(mine)}
        aria-haspopup="menu"
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse') return;
          openedByPress.current = false;
          pressTimer.current = window.setTimeout(() => {
            openedByPress.current = true;
            setPickerOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={clearPress}
        onPointerLeave={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={(event) => event.preventDefault()}
        onClick={() => {
          if (openedByPress.current) {
            openedByPress.current = false;
            return;
          }
          setPickerOpen(false);
          onChange(mine ? null : 'LIKE');
        }}
        className={cn(
          'select-none [-webkit-touch-callout:none]',
          variant === 'post'
            ? 'flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[15px] font-semibold transition hover:bg-stone-100 active:scale-95'
            : 'text-xs font-semibold hover:underline',
          chosen ? chosen.textClass : 'text-stone-600',
        )}
      >
        {variant === 'post' ? (
          chosen && chosen.type !== 'LIKE' ? (
            <span className="text-xl leading-none" aria-hidden="true">
              {chosen.emoji}
            </span>
          ) : (
            <ThumbsUp className={cn('size-5', chosen && 'fill-current')} aria-hidden="true" />
          )
        ) : null}
        {chosen ? chosen.label : 'Thích'}
      </button>
    </span>
  );
}
