import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-emerald-900 text-white',
        secondary: 'border-transparent bg-emerald-100 text-emerald-900',
        outline: 'text-stone-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
