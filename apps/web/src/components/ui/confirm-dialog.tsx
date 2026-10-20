'use client';

import { AlertTriangle, HelpCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from '@/components/ui/button';
import { Presence } from '@/components/ui/presence';
import { ScrollDialog } from '@/components/ui/scroll-dialog';
import { cn } from '@/lib/utils';

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
};

type PendingConfirm = ConfirmOptions & { resolve: (confirmed: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error('useConfirm chỉ dùng được bên trong ConfirmProvider.');
  }
  return confirm;
}

function ConfirmDialog({
  pending,
  onAnswer,
}: {
  pending: ConfirmOptions;
  onAnswer: (confirmed: boolean) => void;
}) {
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = pending.tone === 'danger';

  useEffect(() => {
    (danger ? cancelRef : confirmRef).current?.focus();
  }, [danger]);

  const Icon = danger ? AlertTriangle : HelpCircle;
  return (
    <ScrollDialog
      title={pending.title}
      onClose={() => onAnswer(false)}
      size="sm"
      stacked
      role="alertdialog"
      describedBy={pending.message ? messageId : undefined}
      closeLabel={pending.cancelLabel ?? 'Hủy'}
      footer={
        <>
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => onAnswer(false)}>
            {pending.cancelLabel ?? 'Hủy'}
          </Button>
          <Button
            ref={confirmRef}
            type="button"
            onClick={() => onAnswer(true)}
            className={cn(danger && 'bg-red-700 text-white hover:bg-red-800')}
          >
            {pending.confirmLabel ?? 'Đồng ý'}
          </Button>
        </>
      }
    >
      <div className="grid justify-items-center gap-3 text-center">
        <span
          className={cn(
            'grid size-12 place-items-center rounded-full ring-1 ring-inset',
            danger
              ? 'bg-red-50 text-red-700 ring-red-300'
              : 'bg-gold-50 text-wood-700 ring-gold-400/60',
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        {pending.message ? (
          <p id={messageId} className="text-sm leading-6 text-stone-700">
            {pending.message}
          </p>
        ) : null}
      </div>
    </ScrollDialog>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setPending((current) => {
          current?.resolve(false);
          return { ...options, resolve };
        });
      }),
    [],
  );

  const answer = useCallback(
    (confirmed: boolean): void => {
      pending?.resolve(confirmed);
      setPending(null);
    },
    [pending],
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Presence>{pending ? <ConfirmDialog pending={pending} onAnswer={answer} /> : null}</Presence>
    </ConfirmContext.Provider>
  );
}
