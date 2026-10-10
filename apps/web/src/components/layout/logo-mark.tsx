import Image from 'next/image';

import { SITE_BRAND } from '@/lib/site-brand';
import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      className={cn('rounded-full object-cover', className)}
      src={SITE_BRAND.logoMarkSrc}
      alt=""
      aria-hidden="true"
      width={384}
      height={384}
      sizes="64px"
    />
  );
}
