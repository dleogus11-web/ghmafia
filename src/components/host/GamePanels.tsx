import { useNavigate } from '@tanstack/react-router';
import type { Player } from '@/types';
import type { HostSession } from '@/lib/game/hostSession';
import { ROLE, TEAM_NAME } from '@/lib/game/roles';
import { useCountdown } from '@/hooks/useCountdown';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AnnounceCard } from '@/components/common/AnnounceCard';
import { TeamBadge } from '@/components/common/RoleBadge';
import { Msg } from '@/components/common/StatusCards';
import { cn } from '@/lib/utils';
import { hostStatusText } from './hostStatus';

interface Props {
  session: HostSession;
  hideRoles: boolean;
  setHideRoles(v: boolean): void;
}

export function GamePanels({ session, hideRoles, setHideRoles }: Props) {
  const S = session.state;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        {S.phase === 'end' && <EndPanel session={session} />}
        <PlayerTable session={session} hideRoles={hideRoles} setHideRoles={setHideRoles} />
      </div>
      <div className="flex flex-col gap-4">
        <AnnounceCard announce={S.announce} eyebrow="학생 화면 안내" />
        {(S.phase === 'day' || S.phase === 'vote') && <TimerPanel session={session} />}
        {S.phase === 'night' && S.night?.quiz && (
          <Card>
            <div className="eyebrow">오늘의 퀴즈</div>
            <p>{S.night.quiz.q}</p>
            <p className="text-sm text-muted-foreground">정답: {S.night.quiz.options[S.night.quiz.answer]}</p>
          </Card>
        )}
        {!hideRoles && <LogPanel log={S.log} />}
        <Msg>{hostStatusText(session.status)}</Msg>
      </div>
    </div>
  );
}

function EndPanel({ session }: { session: HostSession }) {
  const navigate = useNavigate();
  const S = session.state;
  const aw = session.engine.awards();
  if (!S.winner) return null;
  return (
    <Card>
      <div className="eyebrow">결과</div>
      <div className="font-display text-[2rem]">{TEAM_NAME[S.winner]} 승리</div>
      <p className="text-muted-foreground">{S.endReason}</p>
      <p>
        추리왕: {aw.detective ? `${aw.detective.names.join(', ')} (마피아 ${aw.detective.n}번 맞힘)` : '없음'}
        <br />
        퀴즈왕: {aw.quiz ? `${aw.quiz.names.join(', ')} (${aw.quiz.n}문제)` : '없음'}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="default" onClick={() => session.engine.playAgain()}>
          같은 학생들과 다시 하기
        </Button>
        <Button onClick={() => navigate({ to: '/host' })}>새 방 만들기</Button>
      </div>
    </Card>
  );
}

function PlayerTable({ session, hideRoles, setHideRoles }: Props) {
  const E = session.engine;
  const S = session.state;
  const al = E.alive();
  const count = (team: string) => al.filter((p) => p.role && ROLE[p.role].team === team).length;

  const statusCell = (p: Player) => {
    if (!p.alive) return <span className="text-muted-foreground">—</span>;
    if (!['night', 'vote', 'terror'].includes(S.phase)) return <span className="text-muted-foreground">·</span>;
    if (S.phase === 'terror' && S.day?.terrorist !== p.id) return <span className="text-muted-foreground">·</span>;
    return E.taskFor(p) ? <span className="text-warn">대기</span> : <span className="font-bold text-good">완료</span>;
  };

  const actionCell = (p: Player): string => {
    if (hideRoles) return '';
    const out: string[] = [];
    const N = S.night;
    if (S.phase === 'night' && N) {
      if (N.quiz && p.id in N.quizAns) out.push(N.quizAns[p.id] === N.quiz.answer ? '퀴즈 ○' : '퀴즈 ×');
      const a = N.picks[p.id];
      const lbl: Record<string, string> = { kill: '공격', heal: '보호', inspect: '조사', medium: '확인', revive: '부활', suspect: '의심' };
      if (a) out.push(a.target === '__skip' ? '부활 안 함' : `${lbl[a.act] ?? a.act} → ${E.nameOf(a.target)}`);
      const rv = N.revote?.picks[p.id];
      if (N.stage === 'revote' && rv && E.isMafia(p)) out.push(`재지목 → ${E.nameOf(rv.target)}`);
    }
    if (S.phase === 'vote' && S.day?.votes[p.id]) out.push(`투표 → ${E.nameOf(S.day.votes[p.id])}`);
    return out.join(' · ');
  };

  const roleCell = (p: Player) => {
    if (!p.role) return null;
    if (hideRoles) return <Badge>가림</Badge>;
    const used = (p.role === 'soldier' && p.used.soldier) || (p.role === 'priest' && p.used.priest);
    return (
      <TeamBadge team={ROLE[p.role].team}>
        {ROLE[p.role].name}
        {used ? ' (사용함)' : ''}
      </TeamBadge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          플레이어{' '}
          <span className="tnum text-sm text-muted-foreground">
            생존 {al.length} / {S.players.length}
          </span>
        </CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={hideRoles} onCheckedChange={(v) => setHideRoles(v === true)} /> 역할 가리기 (화면을 TV에 띄울 때)
        </label>
      </CardHeader>
      {!hideRoles && (
        <p className="tnum text-sm text-muted-foreground">
          생존 · 마피아 {count('mafia')} · 시민팀 {count('citizen')} · 쥐인간 {count('rat')}
        </p>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>미션</TableHead>
            <TableHead>행동</TableHead>
            <TableHead>연결</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {S.players.map((p, i) => (
            <TableRow key={p.id} className={cn(!p.alive && 'opacity-45')}>
              <TableCell className="tnum text-muted-foreground">{i + 1}</TableCell>
              <TableCell className={cn(!p.alive && 'line-through')}>
                {p.name} {p.bot && <Badge>가상</Badge>}
              </TableCell>
              <TableCell>{roleCell(p)}</TableCell>
              <TableCell>{p.alive ? '생존' : <span className="text-muted-foreground">탈락{p.diedAt ? ' · ' + p.diedAt : ''}</span>}</TableCell>
              <TableCell>{statusCell(p)}</TableCell>
              <TableCell className="text-sm">{actionCell(p)}</TableCell>
              <TableCell>
                {!p.bot && <span className={cn('inline-block size-2 rounded-full', p.connected ? 'bg-good' : 'bg-border')} title={p.connected ? '연결됨' : '연결 끊김'} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TimerPanel({ session }: { session: HostSession }) {
  const text = useCountdown(session.state.timerEnd);
  return (
    <Card>
      <CardHeader>
        <CardTitle>토론 타이머</CardTitle>
        <span className="tnum font-display text-[1.4rem]">{text}</span>
      </CardHeader>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 5].map((m) => (
          <Button key={m} onClick={() => session.engine.setTimer(m)}>
            {m}분
          </Button>
        ))}
        <Button onClick={() => session.engine.setTimer(0)}>멈춤</Button>
      </div>
    </Card>
  );
}

function LogPanel({ log }: { log: string[] }) {
  return (
    <Card>
      <CardTitle>진행 기록</CardTitle>
      <div className="flex max-h-[340px] flex-col gap-1.5 overflow-auto text-[0.88rem]">
        {log.length ? (
          log.map((l, i) => (
            <div key={i} className="border-b border-dashed pb-1.5">
              {l}
            </div>
          ))
        ) : (
          <span className="text-muted-foreground">아직 없어요.</span>
        )}
      </div>
    </Card>
  );
}
