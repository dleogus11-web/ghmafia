import { useEffect, useState } from 'react';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** 밤 미션·퀴즈·투표: 하나 고르고 제출 */
export function TaskPanel({ task, onSubmit }: { task: Task; onSubmit(key: string, value: string): void }) {
  const [sel, setSel] = useState<string | undefined>(undefined);
  const [sending, setSending] = useState(false);

  // 새 할 일이 오면 초기화
  useEffect(() => {
    setSel(undefined);
    setSending(false);
  }, [task.key]);

  // 4초 안에 화면이 안 바뀌면 다시 제출할 수 있게
  useEffect(() => {
    if (!sending) return;
    const t = setTimeout(() => setSending(false), 4000);
    return () => clearTimeout(t);
  }, [sending]);

  return (
    <Card>
      <div className="eyebrow">{task.prompt}</div>
      <h3 className="text-[1.15rem]">{task.question ?? '한 명을 골라 주세요'}</h3>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={task.prompt}>
        {task.options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={sel === o.id}
            className={cn(
              'min-h-[52px] rounded-[10px] border bg-secondary px-2.5 py-3 text-center font-medium',
              sel === o.id && 'border-primary bg-primary text-primary-foreground',
              o.wide && 'col-span-2',
            )}
            onClick={() => setSel(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <Button
        variant="default"
        size="lg"
        disabled={sel === undefined || sending}
        onClick={() => {
          if (sel === undefined) return;
          setSending(true);
          onSubmit(task.key, sel);
        }}
      >
        {sending ? '보내는 중…' : '제출하기'}
      </Button>
    </Card>
  );
}
