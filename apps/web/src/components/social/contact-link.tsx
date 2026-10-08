'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { SocialContact } from '@/components/social/social-contact';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';

/**
 * A link that opens the "Liên hệ tạo gia phả" popup. It is a link rather than a button so it
 * takes the styling of the menu or footer it sits in, and without script it still leads to
 * `href`, the footer's contact details.
 */
export function ContactLink({
  href = '#lien-he',
  className,
  onOpen,
  children,
}: {
  href?: string;
  className?: string;
  /** Runs as the popup opens, e.g. to fold the phone menu away. */
  onOpen?: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // The portal needs <body>, which only exists once the page runs in the browser.
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
      {/* On <body>: a backdrop blur on an ancestor (the header bar) would trap a fixed dialog. */}
      {mounted
        ? createPortal(
            <Presence>
              {open ? (
                <SheetDialog title="Liên hệ tạo gia phả" onClose={() => setOpen(false)}>
                  <p className="text-sm leading-6 text-stone-600">
                    Gọi hoặc nhắn cho chúng tôi để được tư vấn và tạo không gian gia phả riêng cho
                    dòng họ của bạn.
                  </p>
                  <SocialContact />
                </SheetDialog>
              ) : null}
            </Presence>,
            document.body,
          )
        : null}
    </>
  );
}
