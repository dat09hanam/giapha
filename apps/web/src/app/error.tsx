'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-xl place-items-center px-6 text-center">
      <div>
        <TriangleAlert className="mx-auto size-12 text-amber-700" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Chưa thể tải dữ liệu</h1>
        <p className="mt-3 leading-7 text-stone-600">
          Máy chủ có thể chưa khởi động. Hãy thử lại sau khi API và MySQL đã sẵn sàng.
        </p>
        <Button className="mt-7" onClick={reset}>
          Thử lại
        </Button>
      </div>
    </main>
  );
}
