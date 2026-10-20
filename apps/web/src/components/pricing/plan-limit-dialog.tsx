'use client';

import { Clock, MessageCircle, Phone, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import { Presence } from '@/components/ui/presence';
import { ScrollDialog } from '@/components/ui/scroll-dialog';
import { useSiteContact } from '@/components/social/site-contact-provider';
import { phoneHref, zaloHref } from '@/lib/site-contact';
import { displayPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';

import styles from './plan-limit-dialog.module.css';

export const PLAN_LIMIT_TITLE = 'Đã đạt giới hạn của gói';
export const LOCKED_FEATURE_TITLE = 'Tính năng cần nâng cấp gói';

/** The message for a section the family's plan does not include. */
export function lockedFeatureMessage(feature: string): string {
  return `Gói dịch vụ hiện tại của dòng họ chưa được sử dụng tính năng “${feature}”. Hãy nâng cấp gói để mở tính năng này.`;
}

/**
 * Shown when an addition would exceed the family's plan, whether the web caught it early or the
 * API refused it, or when a section the plan does not include is opened. The way out is a bigger
 * plan, so the admin's phone is the centrepiece: tapping the number calls it.
 */
function PlanLimitDialogPanel({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose: () => void;
}) {
  const messageId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const contact = useSiteContact();

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <ScrollDialog
      title={title}
      onClose={onClose}
      stacked
      role="alertdialog"
      describedBy={messageId}
    >
      <p id={messageId} className={styles.message}>
        {message}
      </p>
      <div className={styles.contact}>
        <p className={styles.contactLabel}>Liên hệ quản trị viên để nâng cấp gói</p>
        <a
          href={phoneHref(contact.phone)}
          className={styles.phoneRow}
          aria-label={`Gọi quản trị viên số ${displayPhone(contact.phone)}`}
        >
          <span className={styles.phoneIcon}>
            <Phone className="size-5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          </span>
          <span className={styles.phoneNumber}>{displayPhone(contact.phone)}</span>
        </a>
        <p className={styles.hours}>
          <Clock className="size-4" aria-hidden="true" />
          {contact.hours}
        </p>
      </div>
      <div className={styles.actions}>
        <a
          href={zaloHref(contact)}
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
    </ScrollDialog>
  );
}

export function PlanLimitDialog({
  title = PLAN_LIMIT_TITLE,
  message,
  onClose,
}: {
  title?: string;
  /** Null keeps the dialog closed. */
  message: string | null;
  onClose: () => void;
}) {
  return (
    <Presence>
      {message ? <PlanLimitDialogPanel title={title} message={message} onClose={onClose} /> : null}
    </Presence>
  );
}
