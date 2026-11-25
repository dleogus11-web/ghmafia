import { Moon, Sun } from 'lucide-react';
import type { HostSession } from '@/lib/game/hostSession';
import { MAX_ROUND, PHASE_LABEL } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';

export type ArmId = 'day' | 'close' | 'terror';

interface Props {
  session: HostSession;
  armed: ArmId | null;
  /** n>0 이면 한 번 더 눌러야 실행 */
  armOrRun(id: ArmId, n: number, fn: () => void): void;
}

export function HostTopbar({ session, armed, armOrRun }: Props) {
  const E = session.engine;
  const S = E.s;
  const pend = E.pending().length;
  const aliveN = E.alive().length;
  const canNight = S.phase === 'roles' || S.phase === 'dayEnd';
  const canDay = S.phase === 'night';
  const revoteNight = S.night?.stage === 'revote';

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-10 -mx-1 flex flex-wrap items-center gap-3 border-b bg-background px-1 py-2.5">
      <div>
        <div className="eyebrow">방 코드</div>
        <div className="tnum font-display text-[1.8rem] leading-none tracking-[0.12em]">{S.code}</div>
      </div>
      <div>
        <div className="eyebrow">{S.round ? `${S.round} / ${MAX_ROUND} 라운드` : '준비'}</div>
        <div className="font-display text-[1.3rem]">{PHASE_LABEL[S.phase]}</div>
      </div>
      <div className="flex-1" />
      {S.phase !== 'lobby' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="default" size="lg" disabled={!canNight} onClick={() => E.startNight()}>
            <Moon /> 밤이 되었습니다
          </Button>
          <Button
            variant={armed === 'day' ? 'warn' : 'default'}
            size="lg"
            disabled={!canDay}
            onClick={() => armOrRun('day', pend, () => E.toMorning())}
          >
            <Sun />
            {armed === 'day' ? `미제출 ${pend}명 · 그래도 아침으로` : revoteNight ? '낮이 되었습니다 (마피아 재지목 중)' : '낮이 되었습니다'}
            {canDay && <span className="tnum">({aliveN - pend}/{aliveN})</span>}
          </Button>
          {S.phase === 'day' && (
            <Button variant="default" onClick={() => E.startVote()}>
              투표 시작
            </Button>
          )}
          {S.phase === 'vote' && (
            <Button variant={armed === 'close' ? 'warn' : 'default'} onClick={() => armOrRun('close', pend, () => E.closeVote())}>
              {armed === 'close' ? `미투표 ${pend}명 · 그래도 마감` : S.day?.stage === 'revote' ? '결선 투표 마감' : '투표 마감'}
              <span className="tnum">({aliveN - pend}/{aliveN})</span>
            </Button>
          )}
          {S.phase === 'terror' && (
            <Button variant={armed === 'terror' ? 'warn' : 'secondary'} onClick={() => armOrRun('terror', 1, () => E.skipTerror())}>
              {armed === 'terror' ? '지목 없이 진행할까요? 한 번 더 누르기' : '테러리스트 지목 기다리는 중 · 건너뛰기'}
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
