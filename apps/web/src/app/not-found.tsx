import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-xl place-items-center px-6 text-center">
      <div>
        <SearchX className="mx-auto size-12 text-emerald-800" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">Không tìm thấy gia phả</h1>
        <p className="mt-3 leading-7 text-stone-600">
          Đường dẫn có thể chưa đúng hoặc không gian gia phả này hiện chưa được công khai.
        </p>
        <Button asChild className="mt-7">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </main>
  );
}
