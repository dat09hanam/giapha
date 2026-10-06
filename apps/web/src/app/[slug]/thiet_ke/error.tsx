'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function FamilyDesignerError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto grid min-h-[70vh] w-full max-w-2xl place-items-center px-4 py-12">
      <section className="heritage-panel w-full rounded-2xl p-6 text-center sm:p-10">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-brand-800">
          Chưa thể mở trang thiết kế
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-600">
          Có lỗi khi chuẩn bị bản thiết kế gia phả. Hãy kiểm tra kết nối rồi thử lại.
        </p>
        <Button className="mt-6" type="button" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Thử lại
        </Button>
      </section>
    </main>
  );
}
