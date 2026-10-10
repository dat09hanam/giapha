import { PhoneCall, type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const RingingPhone = forwardRef<SVGSVGElement, LucideProps>(function RingingPhone(
  { className, ...props },
  ref,
) {
  return (
    <PhoneCall ref={ref} className={cn('phone-ring', className)} aria-hidden="true" {...props} />
  );
});
