'use client';

import { BellOff, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/heritage-loader';
import { unsubscribeAnniversaryReminder } from '@/lib/anniversary-api';
import { getApiErrorMessage } from '@/lib/api-error';

/**
 * Cancels one reminder from the link in its email. It waits for a click, so mail scanners that
 * open links in advance do not cancel anything.
 */
export function UnsubscribeReminder({ token }: { token: string }) {
  const [state, setState] = useState<
    | { step: 'idle' }
    | { step: 'working' }
    | { step: 'done'; personName: string; familyName: string }
    | { step: 'failed'; message: string }
  >({ step: 'idle' });

  async function cancel(): Promise<void> {
    setState({ step: 'working' });
    try {
      const result = await unsubscribeAnniversaryReminder(token);
      setState({ step: 'done', ...result });
    } catch (error: unknown) {
      setState({ step: 'failed', message: getApiErrorMessage(error, 'hủy nhắc lịch giỗ') });
    }
  }

  if (!token) {
    return (
      <p role="alert" className="text-sm text-red-700">
        Đường dẫn hủy nhắc không đầy đủ. Hãy mở lại đường dẫn trong email.
      </p>
    );
  }

  if (state.step === 'done') {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Đã hủy nhắc ngày giỗ của <strong>{state.personName}</strong> ({state.familyName}). Bạn sẽ
          không nhận email nhắc này nữa.
        </span>
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-stone-700">
        Bấm nút dưới đây để ngừng nhận email nhắc ngày giỗ này. Các lời nhắc khác (nếu có) vẫn giữ
        nguyên.
      </p>
      <Button type="button" onClick={() => void cancel()} disabled={state.step === 'working'}>
        {state.step === 'working' ? (
          <InlineLoader className="size-4" />
        ) : (
          <BellOff className="size-4" aria-hidden="true" />
        )}
        Hủy nhắc lịch giỗ
      </Button>
      {state.step === 'failed' ? (
        <p role="alert" className="text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
