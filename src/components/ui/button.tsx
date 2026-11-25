import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[filter,background-color] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:brightness-105',
  {
    variants: {
      variant: {
        default: 'bg-primary font-bold text-primary-foreground',
        secondary: 'border border-border bg-secondary text-secondary-foreground',
        outline: 'border border-border bg-transparent',
        destructive: 'border border-mafia bg-transparent text-mafia',
        /** 한 번 더 눌러 확인하는 상태 */
        warn: 'border border-warn bg-warn font-bold text-warn-foreground',
        ghost: 'hover:bg-secondary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-3.5 py-2.5',
        sm: 'h-9 px-3',
        lg: 'min-h-12 px-[18px] py-3.5 text-base',
        icon: 'size-8 rounded-md',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { Button, buttonVariants };
