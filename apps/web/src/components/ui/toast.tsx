'use client';

import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type ToastKind = 'success' | 'error';

type ToastInput = {
  kind: ToastKind;
  message: string;
};

type Toast = ToastInput & { id: number };

/** Errors stay long enough to be read and acted on; confirmations can go sooner. */
const DURATION_BY_KIND: Record<ToastKind, number> = {
  success: 4000,
  error: 7000,
};

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function useToast(): (toast: ToastInput) => void {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error('useToast chỉ dùng được bên trong ToastProvider.');
  }

  return showToast;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number): void => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({ kind, message }: ToastInput): void => {
      const id = (nextId.current += 1);
      setToasts((current) => [...current, { id, kind, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), DURATION_BY_KIND[kind]),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {toasts.map((toast) => {
          const Icon = toast.kind === 'error' ? CircleAlert : CheckCircle2;
          return (
            <div
              key={toast.id}
              role={toast.kind === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-5 shadow-lg backdrop-blur',
                toast.kind === 'error'
                  ? 'border-red-200 bg-red-50/95 text-red-800'
                  : 'border-emerald-200 bg-emerald-50/95 text-emerald-900',
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0 flex-1">{toast.message}</p>
              <button
                type="button"
                className="-mr-1 -mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg transition hover:bg-black/5"
                aria-label="Đóng thông báo"
                onClick={() => dismiss(toast.id)}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
