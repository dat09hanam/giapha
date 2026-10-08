import { PhoneCall, type LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * The phone icon of the contact buttons, shaking now and then like a ringing phone. Built with
 * forwardRef like lucide's own icons, so it fits wherever a `LucideIcon` is expected.
 */
export const RingingPhone = forwardRef<SVGSVGElement, LucideProps>(function RingingPhone(
  { className, ...props },
  ref,
) {
  return (
    <PhoneCall ref={ref} className={cn('phone-ring', className)} aria-hidden="true" {...props} />
  );
});
