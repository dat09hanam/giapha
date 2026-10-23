'use client';

import { HardDrive, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { storageLevel, storageRatio, type FamilyStorage } from '@/lib/family-storage';
import { formatMegabytes } from '@/lib/plan-catalog';
import { cn } from '@/lib/utils';

function dismissKey(slug: string, level: string): string {
  return `giapha:storage-warning:${slug}:${level}`;
}

/**
 * Tells the clan head, on every family page, that uploads are nearly or fully out of room.
 * Dismissing hides it for the browser session; reaching the next level shows it again.
 */
export function StorageWarningBanner({ slug, storage }: { slug: string; storage: FamilyStorage }) {
  const level = storageLevel(storage);
  // Unknown until mounted, so a banner dismissed earlier in the session never flashes.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(dismissKey(slug, level)) === '1');
    } catch {
      setDismissed(false);
    }
  }, [slug, level]);

  if (level === 'ok' || storage.limitMb === null || dismissed !== false) return null;

  function dismiss(): void {
    try {
      window.sessionStorage.setItem(dismissKey(slug, level), '1');
    } catch {
      // Without storage the banner simply hides until the next page load.
    }
    setDismissed(true);
  }

  const full = level === 'full';
  const percent = Math.round(storageRatio(storage) * 100);
  const usage = `${formatMegabytes(storage.usedMb)} / ${formatMegabytes(storage.limitMb)}`;

  return (
    <div className="px-3 pt-3 sm:px-4 lg:px-8 print:hidden">
      <div
        role={full ? 'alert' : 'status'}
        className={cn(
          'mx-auto flex max-w-5xl flex-wrap items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm',
          full
            ? 'border-red-300 bg-red-50 text-red-900'
            : 'border-amber-300 bg-amber-50 text-amber-950',
        )}
      >
        <HardDrive
          className={cn('mt-0.5 size-5 shrink-0', full ? 'text-red-600' : 'text-amber-600')}
          aria-hidden="true"
        />
        <div className="grid min-w-0 flex-1 basis-60 gap-0.5">
          <p className="font-medium">
            {full ? 'Đã hết dung lượng lưu trữ' : `Dung lượng lưu trữ đã dùng ${percent}%`}
            <span className="font-normal"> · {usage}</span>
          </p>
          <p className="text-xs leading-5 opacity-80">
            {full
              ? `Gói “${storage.planName}” đã đầy: không thể tải thêm ảnh, tư liệu hay ảnh đại diện. Hãy xóa bớt tệp không cần thiết hoặc nâng cấp gói.`
              : `Gói “${storage.planName}” sắp đầy. Hãy xóa bớt tệp không cần thiết hoặc nâng cấp gói trước khi không tải thêm được.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/${encodeURIComponent(slug)}/tu-lieu`}>Quản lý tư liệu</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/${encodeURIComponent(slug)}#goi-dich-vu`}>Xem các gói</Link>
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="grid size-8 place-items-center rounded-lg opacity-60 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Ẩn thông báo dung lượng"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
