import { HardDrive } from 'lucide-react';

import { storageLevel, storageRatio, type FamilyStorage } from '@/lib/family-storage';
import { formatMegabytes } from '@/lib/plan-catalog';
import { cn } from '@/lib/utils';

/** How much of the plan's storage the family's uploads take; shown to the clan head once 100 MB or less is left. */
export function StorageMeter({ storage }: { storage: FamilyStorage }) {
  const { planName, usedMb, limitMb } = storage;
  const ratio = storageRatio(storage);
  const level = storageLevel(storage);
  if (level === 'ok' || limitMb === null) return null;
  const tone = level === 'full' ? 'bg-red-600' : 'bg-amber-500';

  return (
    <div className="surface grid gap-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex items-center gap-2 font-medium text-brand-950">
          <HardDrive className="size-4 text-stone-500" aria-hidden="true" />
          Dung lượng lưu trữ
        </span>
        <span className={cn('text-stone-600', level === 'full' && 'font-medium text-red-700')}>
          {`${formatMegabytes(usedMb)} / ${formatMegabytes(limitMb)}`}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Dung lượng lưu trữ đã dùng"
        aria-valuemin={0}
        aria-valuemax={limitMb}
        aria-valuenow={Math.min(usedMb, limitMb)}
        className="h-2 overflow-hidden rounded-full bg-stone-200"
      >
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="text-xs text-stone-500">
        {level === 'full'
          ? `Đã hết dung lượng của gói “${planName}”. Hãy xóa bớt ảnh, tư liệu hoặc nâng cấp gói để tải thêm.`
          : `Sắp hết dung lượng của gói “${planName}”.`}
      </p>
    </div>
  );
}
