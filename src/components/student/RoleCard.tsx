import { useEffect, useState } from 'react';
import type { StudentSelf } from '@/types';
import { cn } from '@/lib/utils';

/** 누르고 있는 동안만 역할이 보이는 카드 (옆 친구가 못 보게) */
export function RoleCard({ me }: { me: StudentSelf }) {
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!holding) return;
    const off = () => setHolding(false);
    window.addEventListener('pointerup', off);
    window.addEventListener('pointercancel', off);
    window.addEventListener('blur', off);
    return () => {
      window.removeEventListener('pointerup', off);
      window.removeEventListener('pointercancel', off);
      window.removeEventListener('blur', off);
    };
  }, [holding]);

  return (
    <button
      type="button"
      aria-label="길게 눌러 내 역할 보기"
      className={cn(
        'flex min-h-[140px] select-none flex-col justify-center gap-1.5 rounded-[14px] border-2 border-dashed bg-card p-[18px] text-center [-webkit-touch-callout:none] [touch-action:none]',
        holding && 'border-solid border-primary',
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        setHolding(true);
      }}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setHolding(true)}
      onKeyUp={() => setHolding(false)}
    >
      {holding ? (
        <>
          <div className="eyebrow">{me.teamName}</div>
          <div className={cn('font-display text-[2.3rem] leading-tight', me.team === 'mafia' && 'text-mafia')}>{me.roleName}</div>
          <p className="text-sm">{me.desc}</p>
          {me.teammates.length > 0 && (
            <p className="text-sm">
              동료 마피아: <b>{me.teammates.join(', ')}</b>
            </p>
          )}
          {me.role === 'soldier' && <p className="text-sm text-muted-foreground">방어: {me.used.soldier ? '사용함' : '남아 있음'}</p>}
          {me.role === 'priest' && <p className="text-sm text-muted-foreground">부활: {me.used.priest ? '사용함' : '남아 있음'}</p>}
        </>
      ) : (
        <>
          <div className="font-display text-[1.3rem]">내 역할</div>
          <p className="text-sm text-muted-foreground">길게 누르는 동안만 보여요</p>
        </>
      )}
    </button>
  );
}
