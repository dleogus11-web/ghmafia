import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Msg({ children, error, className }: { children: ReactNode; error?: boolean; className?: string }) {
  return (
    <p className={cn('rounded-lg bg-secondary px-3 py-2.5 text-sm', error && 'text-mafia', className)} role={error ? 'alert' : undefined}>
      {children}
    </p>
  );
}

export function PulseDot() {
  return <span className="inline-block size-3 animate-pulse-dot rounded-full bg-primary" aria-hidden />;
}

export function LoadingCard({ text = '불러오는 중…' }: { text?: string }) {
  return (
    <div className="mx-auto w-full max-w-[460px] pt-[10vh]">
      <Card className="items-center py-8 text-center">
        <PulseDot />
        <p className="text-muted-foreground">{text}</p>
      </Card>
    </div>
  );
}

export function Moon() {
  return <div className="mb-1.5 size-[54px] rounded-full bg-primary shadow-[inset_-14px_-6px_0_0_hsl(var(--background))]" aria-hidden />;
}
