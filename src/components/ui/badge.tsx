import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-block whitespace-nowrap rounded-full border px-[7px] py-px text-[0.74rem]', {
  variants: {
    variant: {
      default: 'border-border bg-secondary text-muted-foreground',
      mafia: 'border-mafia text-mafia',
      citizen: 'border-good text-good',
      rat: 'border-warn text-warn',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
