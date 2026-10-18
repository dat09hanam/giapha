import { Crown } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Small crown pinned to the top-right corner of a control whose feature the family's plan does
 * not include. The control keeps showing; the parent must be `relative`.
 */
export function PlanCrown({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'pointer-events-none absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 shadow-sm ring-2 ring-white',
        className,
      )}
      aria-hidden="true"
    >
      <Crown className="size-3" strokeWidth={2.5} />
    </span>
  );
}
