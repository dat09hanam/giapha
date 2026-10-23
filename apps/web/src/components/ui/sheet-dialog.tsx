'use client';

import type { ReactNode } from 'react';

import { ScrollDialog, type ScrollDialogSize } from '@/components/ui/scroll-dialog';

/** A form or details dialog with actions in the footer, drawn as the platform's scroll. */
export function SheetDialog({
  title,
  onClose,
  busy = false,
  footer,
  children,
  size = 'md',
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  footer?: ReactNode;
  children: ReactNode;
  size?: ScrollDialogSize;
}) {
  return (
    <ScrollDialog title={title} onClose={onClose} busy={busy} footer={footer} size={size}>
      {children}
    </ScrollDialog>
  );
}
