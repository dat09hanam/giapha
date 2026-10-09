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
import { cn } from '@/lib/utils';

export type ConfirmOptions = {
  title: string;
  /** A sentence or two under the title, e.g. what cannot be undone. */
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` for deleting or discarding: a red button and a warning icon. */
  tone?: 'default' | 'danger';
};

type PendingConfirm = ConfirmOptions & { resolve: (confirmed: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Asks the visitor to confirm, in place of `window.confirm`:
 * `if (!(await confirm({ title: 'Xóa bài viết này?', tone: 'danger' }))) return;`
 */
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
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const danger = pending.tone === 'danger';

  useEffect(() => {
    // Cancel is the safe default for a destructive question.
    (danger ? cancelRef : confirmRef).current?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onAnswer(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [danger, onAnswer]);

  const Icon = danger ? AlertTriangle : HelpCircle;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4">
      <button
        type="button"
        className="ui-backdrop absolute inset-0 bg-stone-950/50 backdrop-blur-[2px]"
        aria-label={pending.cancelLabel ?? 'Hủy'}
        tabIndex={-1}
        onClick={() => onAnswer(false)}
      />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={pending.message ? messageId : undefined}
        className="ui-dialog heritage-panel relative w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl sm:p-6"
      >
        <span
          className={cn(
            'mx-auto grid size-12 place-items-center rounded-2xl',
            danger ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-wood-700',
          )}
        >
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 id={titleId} className="mt-4 font-display text-lg font-bold text-wood-800">
          {pending.title}
        </h2>
        {pending.message ? (
          <p id={messageId} className="mt-2 text-sm leading-6 text-stone-600">
            {pending.message}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-2">
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
        </div>
      </section>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        // A second question while one is open answers the first with "no".
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
