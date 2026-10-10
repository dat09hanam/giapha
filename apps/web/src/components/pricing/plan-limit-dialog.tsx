'use client';

import { Clock, Crown, MessageCircle, Phone, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useRef } from 'react';

import { Presence } from '@/components/ui/presence';
import { SITE_CONTACT, phoneHref, zaloHref } from '@/lib/site-contact';
import { cn } from '@/lib/utils';

import styles from './plan-limit-dialog.module.css';

const LOTUS_SRC = '/images/decorations/lotus-bloom.webp';

/** A small lotus between two rules, under the title. */
function LotusOrnament() {
  return (
    <svg width="22" height="14" viewBox="0 0 22 14" fill="currentColor" aria-hidden="true">
      <path d="M11 0c1.6 2.2 2.4 4.4 2.4 6.6S12.6 10.8 11 13c-1.6-2.2-2.4-4.2-2.4-6.4S9.4 2.2 11 0Z" />
      <path d="M3.2 4.2c2.7.3 4.8 1.5 6.2 3.6.6.9 1 1.9 1.1 3-2.6-.2-4.6-1.3-5.9-3.2-.7-1-1.2-2.1-1.4-3.4Z" />
      <path d="M18.8 4.2c-.2 1.3-.7 2.4-1.4 3.4-1.3 1.9-3.3 3-5.9 3.2.1-1.1.5-2.1 1.1-3 1.4-2.1 3.5-3.3 6.2-3.6Z" />
      <path d="M0 9.6c2.4-.6 4.6-.3 6.6.9.8.5 1.5 1.1 2 1.9-2.3.6-4.4.4-6.3-.6C1.4 11.3.6 10.6 0 9.6Z" />
      <path d="M22 9.6c-.6 1-1.4 1.7-2.3 2.2-1.9 1-4 1.2-6.3.6.5-.8 1.2-1.4 2-1.9 2-1.2 4.2-1.5 6.6-.9Z" />
    </svg>
  );
}

/**
 * Shown when an addition would exceed the family's plan, whether the web caught it early or the
 * API refused it. The way out is a bigger plan, so the admin's phone is the centrepiece: tapping
 * the number calls it.
 */
function PlanLimitDialogPanel({ message, onClose }: { message: string; onClose: () => void }) {
  const titleId = useId();
  const messageId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label="Đóng"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={cn('ui-dialog', styles.card)}
      >
        <span className={styles.corner} data-at="tl" aria-hidden="true" />
        <span className={styles.corner} data-at="tr" aria-hidden="true" />
        <span className={styles.corner} data-at="bl" aria-hidden="true" />
        <span className={styles.corner} data-at="br" aria-hidden="true" />

        <button type="button" className={styles.close} aria-label="Đóng" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </button>

        <div className={styles.medallionRow} aria-hidden="true">
          <span className={styles.rule} data-side="left" />
          <span className={styles.medallion}>
            <Crown className="size-8" strokeWidth={1.75} />
          </span>
          <span className={styles.rule} data-side="right" />
        </div>

        <h2 id={titleId} className={styles.title}>
          Đã đạt giới hạn của gói
        </h2>
        <div className={styles.divider}>
          <LotusOrnament />
        </div>
        <p id={messageId} className={styles.message}>
          {message}
        </p>

        <div className={styles.contactWrap}>
          <Image
            src={LOTUS_SRC}
            alt=""
            width={512}
            height={467}
            className={styles.lotus}
            data-side="left"
            aria-hidden="true"
          />
          <Image
            src={LOTUS_SRC}
            alt=""
            width={512}
            height={467}
            className={styles.lotus}
            data-side="right"
            aria-hidden="true"
          />
          <div className={styles.contact}>
            <p className={styles.contactLabel}>Liên hệ quản trị viên để nâng cấp gói</p>
            <a
              href={phoneHref(SITE_CONTACT.phone)}
              className={styles.phoneRow}
              aria-label={`Gọi quản trị viên số ${SITE_CONTACT.phone}`}
            >
              <span className={styles.phoneIcon}>
                <Phone className="size-5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
              </span>
              <span className={styles.phoneNumber}>{SITE_CONTACT.phone}</span>
            </a>
            <p className={styles.hours}>
              <Clock className="size-4" aria-hidden="true" />
              {SITE_CONTACT.hours}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <a
            href={zaloHref(SITE_CONTACT.phone)}
            target="_blank"
            rel="noreferrer"
            className={cn(styles.action, styles.zalo)}
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            Nhắn Zalo
          </a>
          <button
            ref={closeRef}
            type="button"
            className={cn(styles.action, styles.dismiss)}
            onClick={onClose}
          >
            <X className="size-5" aria-hidden="true" />
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}

export function PlanLimitDialog({
  message,
  onClose,
}: {
  /** Null keeps the dialog closed. */
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Presence>
      {message ? <PlanLimitDialogPanel message={message} onClose={onClose} /> : null}
    </Presence>
  );
}
