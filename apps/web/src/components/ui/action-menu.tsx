'use client';

import { MoreHorizontal } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type ActionMenuItem = {
  key: string;
  label: string;
  icon?: ReactNode;
  /** Opens in a new tab instead of running `onSelect`. */
  href?: string;
  onSelect?: () => void;
};

const GAP_PX = 4;

/**
 * A "⋯" button opening a list of actions. The list is fixed to the viewport so a scrolling
 * table never clips it; it closes on a pick, an outside click, Escape, scroll or resize.
 */
export function ActionMenu({
  label,
  items,
  disabled = false,
}: {
  /** Accessible name of the button, e.g. "Thao tác cho Họ Nguyễn". */
  label: string;
  items: readonly ActionMenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !menuRef.current) return;
    const anchor = buttonRef.current.getBoundingClientRect();
    const height = menuRef.current.offsetHeight;
    const below = anchor.bottom + GAP_PX;
    setPosition({
      top:
        below + height > window.innerHeight && anchor.top - GAP_PX - height > 0
          ? anchor.top - GAP_PX - height
          : below,
      right: Math.max(GAP_PX, window.innerWidth - anchor.right),
    });
    menuRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (): void => setOpen(false);
    const closeOutside = (event: PointerEvent): void => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function moveFocus(step: 1 | -1): void {
    const entries = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );
    if (entries.length === 0) return;
    const index = entries.indexOf(document.activeElement as HTMLElement);
    entries[(index + step + entries.length) % entries.length]?.focus();
  }

  const itemClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-wood-800 outline-none transition hover:bg-gold-100/70 focus-visible:bg-gold-100/70 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gold-700';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setPosition(null);
          setOpen(!open);
        }}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-gold-700/50 bg-[var(--card)] text-wood-700 shadow-sm transition hover:border-gold-700 hover:bg-gold-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50"
      >
        <MoreHorizontal className="size-4" aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={position ?? { top: 0, right: 0 }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              moveFocus(event.key === 'ArrowDown' ? 1 : -1);
            }
          }}
          className={cn(
            'fixed z-50 grid min-w-52 gap-0.5 rounded-xl border border-gold-500/40 bg-[var(--card)] p-1.5 shadow-[0_16px_40px_-18px_rgba(74,46,18,0.55)]',
            !position && 'invisible',
          )}
        >
          {items.map((item) =>
            item.href ? (
              <a
                key={item.key}
                role="menuitem"
                tabIndex={-1}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                {item.icon}
                {item.label}
              </a>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={itemClass}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </>
  );
}
