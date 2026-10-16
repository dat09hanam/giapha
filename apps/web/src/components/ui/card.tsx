import { cn } from '@/lib/utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-[var(--card)] text-[var(--card-foreground)] shadow-[0_14px_32px_-28px_rgba(74,46,18,0.55)]',
        className,
      )}
      {...props}
    />
  );
}

export { Card };
