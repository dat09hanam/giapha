'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { SocialContact } from '@/components/social/social-contact';
import { Presence } from '@/components/ui/presence';
import { SheetDialog } from '@/components/ui/sheet-dialog';

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
            <Presence>
              {open ? (
                <SheetDialog title="Liên hệ tạo gia phả" onClose={() => setOpen(false)}>
                  <p className="text-sm leading-6 text-stone-600">
                    Hãy gọi điện hoặc nhắn tin để chúng tôi tư vấn trực tiếp và đồng hành cùng bạn
                    tạo nên không gian gia phả dành riêng cho dòng họ.
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
