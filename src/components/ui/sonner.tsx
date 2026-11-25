import type { ComponentProps } from 'react';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster = (props: ToasterProps) => (
  <Sonner
    position="top-center"
    toastOptions={{
      classNames: {
        toast: 'group toast !bg-card !text-card-foreground !border-border !shadow-lg',
        description: '!text-muted-foreground',
      },
    }}
    {...props}
  />
);

export { Toaster };
