'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { usePresenceState } from '@/components/ui/presence';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';

import styles from './scroll-dialog.module.css';

export type ScrollDialogSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * The platform's modal dialog, drawn as the hanging scroll of the home page's sign-up forms:
 * wooden rods, a paper sheet, an italic title over a lotus rule. Mount it inside `<Presence>`
 * so it can roll up on close. It renders into `document.body`, so a dialog opened from inside
 * another still covers the screen, locks the page behind it and closes on Escape unless busy.
 */
export function ScrollDialog({
  title,
  subtitle,
  onClose,
  busy = false,
  size = 'md',
  stacked = false,
  role = 'dialog',
  describedBy,
  closeLabel = 'Đóng',
  footer,
  bodyClassName,
  children,
}: {
  /** May hold an `<em>` for the green accent word, as the home page titles do. */
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  /** While true, Escape, the backdrop and the close button do nothing. */
  busy?: boolean;
  size?: ScrollDialogSize;
  /** Above other dialogs, for a confirmation or a picker opened from one. */
  stacked?: boolean;
  role?: 'dialog' | 'alertdialog';
  describedBy?: string;
  closeLabel?: string;
  /** Actions pinned under the scrolling body. */
  footer?: ReactNode;
  bodyClassName?: string;
  children?: ReactNode;
}) {
  useBodyScrollLock();
  const titleId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const presence = usePresenceState();
  // The portal needs the document, which the server render does not have.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  // Keyboard focus moves into the dialog; a child that focused its own control first keeps it.
  useEffect(() => {
    if (host && !sectionRef.current?.contains(document.activeElement)) closeRef.current?.focus();
  }, [host]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  if (!host) return null;
  return createPortal(
    <div
      className={styles.root}
      data-stacked={stacked || undefined}
      data-presence={presence}
      inert={presence === 'closed' || undefined}
    >
      <button
        type="button"
        className={cn('ui-backdrop', styles.backdrop)}
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={() => !busy && onClose()}
      />
      <section
        ref={sectionRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        className={styles.scroll}
        data-size={size}
      >
        <span className={styles.rod} aria-hidden="true">
          <span className={styles.rodSeal} />
        </span>
        <div className={styles.sheetClip}>
          <div className={styles.sheet}>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={busy}
              className={styles.close}
              aria-label={closeLabel}
            >
              <X size={20} aria-hidden="true" />
            </button>
            <header className={styles.header}>
              <h2 id={titleId} className={styles.title}>
                {title}
              </h2>
              <span className={styles.lotusRule} aria-hidden="true" />
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </header>
            <div className={cn(styles.body, bodyClassName)}>{children}</div>
            {footer ? <footer className={styles.footer}>{footer}</footer> : <span />}
          </div>
        </div>
        <span className={styles.rod} aria-hidden="true" />
      </section>
    </div>,
    host,
  );
}

/** A white card on the scroll's paper, for a form or a block of details. */
export function ScrollDialogCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn(styles.card, className)}>{children}</div>;
}
