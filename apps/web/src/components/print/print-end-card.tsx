'use client';

import { CheckCircle2, Printer } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Closes the preview, so a reader who has scrolled through every page can print from there
 * instead of scrolling back up to the toolbar.
 */
export function PrintEndCard({
  summary,
  disabled = false,
}: {
  /** What is about to be printed, such as the page count and paper. */
  summary: ReactNode;
  disabled?: boolean;
}) {
  return (
    <section
      aria-label="Xuất bản in"
      className="mx-auto mt-8 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-stone-300 bg-[#fffdf8] px-6 py-6 text-center shadow-sm print:hidden"
    >
      <CheckCircle2 className="size-8 text-brand-700" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-brand-950">Đã xem hết bản in</h2>
        <p className="text-sm text-stone-600">{summary}</p>
      </div>
      <Button
        type="button"
        className="w-full sm:w-72"
        disabled={disabled}
        onClick={() => window.print()}
      >
        <Printer className="size-4" aria-hidden="true" />
        Xuất PDF / In
      </Button>
      <p className="text-[11px] leading-snug text-stone-500">
        Trong hộp thoại in: chọn <b>Lưu dưới dạng PDF</b>, lề <b>Không có</b> và bật{' '}
        <b>Đồ hoạ nền</b>.
      </p>
    </section>
  );
}
