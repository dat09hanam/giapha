'use client';

import { X } from 'lucide-react';
import { useEffect, useId, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A form dialog: a bottom sheet on phones, a centred card from sm. Render it
 * inside <Presence> for the open and close animation. Escape closes it unless
 * `busy`.
 */
export function SheetDialog({
  title,
  onClose,
  busy = false,
  footer,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  return (
    <div className="fixed inset-0 z-[70] grid items-end sm:place-items-center sm:p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={() => !busy && onClose()}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          'ui-sheet-dialog heritage-panel relative flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl sm:max-w-lg sm:rounded-2xl',
          className,
        )}
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-gold-500/30 bg-paper-deep/55 px-12">
          <h2 id={titleId} className="truncate font-display text-lg font-bold text-wood-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-3 grid size-9 place-items-center rounded-full bg-gold-50 text-wood-600 ring-1 ring-gold-500/25 hover:bg-gold-100 disabled:opacity-50"
            aria-label="Đóng"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-gold-500/30 bg-paper-deep/35 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:justify-end sm:pb-3">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
