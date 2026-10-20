'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styles from '@/components/social/contact.module.css';
import { SocialContact } from '@/components/social/social-contact';
import { Presence } from '@/components/ui/presence';
import { cn } from '@/lib/utils';

function ContactDialog({ onClose }: { onClose: () => void }) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={cn('ui-backdrop', styles.backdrop)}
        aria-label="Đóng"
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('ui-sheet-dialog', styles.panel)}
      >
        <span className={styles.cloud} aria-hidden="true" />
        <span className={styles.mountains} aria-hidden="true" />
        <span className={styles.lotus} aria-hidden="true" />
        <button type="button" onClick={onClose} className={styles.close} aria-label="Đóng">
          <X className="size-5" aria-hidden="true" />
        </button>
        <div className={styles.body}>
          <header className={styles.crestWrap}>
            <span className={styles.crest} aria-hidden="true" />
            <div className={styles.banner}>
              <div className={styles.plaque}>
                <div className={styles.plaqueInner}>
                  <span className={styles.flourish} aria-hidden="true" />
                  <h2 id={titleId} className={styles.title}>
                    Liên hệ tạo gia phả
                  </h2>
                  <span className={styles.flourish} aria-hidden="true" />
                </div>
              </div>
            </div>
          </header>
          <p className={styles.intro}>
            Hãy gọi điện hoặc nhắn tin để chúng tôi tư vấn trực tiếp và đồng hành cùng bạn tạo nên
            không gian gia phả dành riêng cho dòng họ.
          </p>
          <SocialContact />
        </div>
      </section>
    </div>
  );
}

export function ContactLink({
  href = '#lien-he',
  className,
  onOpen,
  children,
}: {
  href?: string;
  className?: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      <a
        href={href}
        className={className}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          onOpen?.();
          setOpen(true);
        }}
      >
        {children}
      </a>
      {mounted
        ? createPortal(
            <Presence>{open ? <ContactDialog onClose={() => setOpen(false)} /> : null}</Presence>,
            document.body,
          )
        : null}
    </>
  );
}
