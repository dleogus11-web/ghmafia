import type { StudentView } from '@/types';
import { useCountdown } from '@/hooks/useCountdown';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TeamBadge } from '@/components/common/RoleBadge';
import { PulseDot } from '@/components/common/StatusCards';
import { cn } from '@/lib/utils';

export function StudentStatusBar({ view }: { view: StudentView }) {
  const timer = useCountdown(view.timerEnd);
  return (
    <div className="flex items-baseline justify-between gap-2.5">
      <div>
        <div className="eyebrow">{view.round ? `${view.round}일째 · 최대 ${view.maxRound}라운드` : `방 ${view.code}`}</div>
        <div className="font-display text-[1.5rem]">{view.phaseLabel}</div>
      </div>
      {view.timerEnd && <div className="tnum font-display text-[1.4rem]">{timer}</div>}
      <div className="text-sm text-muted-foreground">{view.me.name}</div>
    </div>
  );
}

export function WaitingCard() {
  return (
    <Card className="items-center px-2.5 py-[26px] text-center">
      <PulseDot />
      <h3>제출했어요</h3>
      <p className="text-muted-foreground">다른 친구들을 기다리는 중…</p>
    </Card>
  );
}

export function DeadBanner({ diedAt }: { diedAt: string | null }) {
  return (
    <div className="rounded-[10px] border border-mafia bg-secondary px-3.5 py-3 text-center font-bold text-mafia">
      탈락했어요{diedAt ? ` (${diedAt})` : ''} · 끝까지 조용히 지켜봐 주세요
    </div>
  );
}

export function NotesCard({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <Card>
      <div className="eyebrow">나만 아는 정보</div>
      <div className="flex flex-col gap-1 text-[0.92rem]">
        {notes.map((n, i) => (
          <div key={i}>{n}</div>
        ))}
      </div>
    </Card>
  );
}

export function NameChips({ names }: { names: { name: string; alive: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {names.map((x) => (
        <span key={x.name} className={cn('rounded-full border bg-secondary px-3 py-1 text-[0.9rem]', !x.alive && 'line-through opacity-45')}>
          {x.name}
        </span>
      ))}
    </div>
  );
}

export function StudentEnd({ view }: { view: StudentView }) {
  const E = view.end;
  if (!E) return null;
  const mine = E.rows.find((r) => r.name === view.me.name);
  return (
    <>
      <Card>
        <div className="eyebrow">게임 종료</div>
        <div className="font-display text-[2rem]">{E.winnerName} 승리</div>
        <p className="text-muted-foreground">{E.reason}</p>
        <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm">
          {mine?.win ? '🎉 우리 팀이 이겼어요!' : '아쉽지만 우리 팀은 졌어요.'} (나는 {view.me.roleName})
        </p>
        <p className="text-sm">
          추리왕: {E.awards.detective ? E.awards.detective.names.join(', ') : '없음'} · 퀴즈왕: {E.awards.quiz ? E.awards.quiz.names.join(', ') : '없음'}
        </p>
      </Card>
      <Card>
        <h3>모두의 직업</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>직업</TableHead>
              <TableHead>생존</TableHead>
              <TableHead>결과</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {E.rows.map((r) => (
              <TableRow key={r.name}>
                <TableCell>{r.name}</TableCell>
                <TableCell>
                  <TeamBadge team={r.team}>{r.role}</TeamBadge>
                </TableCell>
                <TableCell>{r.alive ? '생존' : '탈락'}</TableCell>
                <TableCell>{r.win ? <b className="text-good">승</b> : <span className="text-muted-foreground">패</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
