import { useState } from 'react';
import { Copy, ExternalLink, Minus, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import type { HostSession } from '@/lib/game/hostSession';
import { ROLE, ROLE_ORDER } from '@/lib/game/roles';
import { MAX_BOTS } from '@/lib/game/constants';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Msg } from '@/components/common/StatusCards';
import { cn } from '@/lib/utils';
import { hostStatusText } from './hostStatus';

export function joinUrl(code: string) {
  return `${window.location.origin}/play/${code}`;
}

export function LobbyPanels({ session }: { session: HostSession }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <JoinPanel session={session} />
        <PlayersPanel session={session} />
        <BotPanel session={session} />
      </div>
      <div className="flex flex-col gap-4">
        <RoleCountsPanel session={session} />
        <QuizPanel session={session} />
        <StartPanel session={session} />
      </div>
    </div>
  );
}

function JoinPanel({ session }: { session: HostSession }) {
  const code = session.state.code;
  const url = joinUrl(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('주소를 복사했어요');
    } catch {
      toast.error('복사하지 못했어요. 주소를 길게 눌러 복사해 주세요.');
    }
  };
  return (
    <Card>
      <div className="eyebrow">학생 참여 안내</div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="tnum font-display text-[3.4rem] leading-none tracking-[0.16em]">{code}</div>
        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <p>
            학생들은 같은 주소로 들어와 <b>참여하기</b>를 누르고 이 코드를 입력해요.
          </p>
          <p className="break-all text-sm text-muted-foreground">바로 들어오는 주소: {url}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void copy()}>
              <Copy /> 주소 복사
            </Button>
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> 학생 화면 새 탭으로 열기
              </a>
            </Button>
          </div>
        </div>
      </div>
      <Msg>{hostStatusText(session.status)}</Msg>
    </Card>
  );
}

function PlayersPanel({ session }: { session: HostSession }) {
  const players = session.state.players;
  const bots = players.filter((p) => p.bot).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          참여한 학생 <span className="tnum">{players.length}</span>명
        </CardTitle>
        {players.length > 0 && (
          <Button variant="destructive" disabled={!bots} onClick={() => session.engine.clearBots()}>
            가상 학생 모두 내보내기
          </Button>
        )}
      </CardHeader>
      {players.length ? (
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border bg-secondary py-1 pl-3 pr-1.5 text-[0.9rem]">
              {!p.bot && <span className={cn('size-2 rounded-full', p.connected ? 'bg-good' : 'bg-border')} title={p.connected ? '연결됨' : '연결 끊김'} />}
              {p.name}
              {p.bot && <span className="text-[0.72rem] text-muted-foreground">가상</span>}
              <button
                type="button"
                className="grid size-[26px] place-items-center rounded-full text-muted-foreground hover:bg-background"
                aria-label={`${p.name} 내보내기`}
                onClick={() => session.kick(p.id)}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          아직 아무도 없어요. 학생이 들어오면 여기에 이름이 떠요. 혼자 시험해 보려면 아래에서 가상 학생을 넣어 보세요.
        </p>
      )}
    </Card>
  );
}

function BotPanel({ session }: { session: HostSession }) {
  const E = session.engine;
  const [botN, setBotN] = useState(10);
  const [fast, setFast] = useState(E.fastBots);
  return (
    <Card>
      <CardTitle>시험해 보기 · 가상 학생</CardTitle>
      <p className="text-sm text-muted-foreground">무작위 이름의 가상 학생이 들어와 밤 미션과 투표를 스스로 해요. 실제 학생과 섞어서 쓸 수도 있어요.</p>
      <div className="flex flex-wrap items-end gap-2.5">
        <div className="flex w-[120px] flex-col gap-1.5">
          <Label htmlFor="botn">학생 수</Label>
          <Input id="botn" type="number" min={1} max={MAX_BOTS} value={botN} onChange={(e) => setBotN(Number(e.target.value) || 1)} />
        </div>
        <Button variant="default" onClick={() => E.addBots(Math.max(1, Math.min(MAX_BOTS, botN)))}>
          가상 학생 넣기
        </Button>
        <Button onClick={() => E.autoFill()}>인원에 맞게 역할 자동 채우기</Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={fast}
          onCheckedChange={(v) => {
            E.fastBots = v === true;
            setFast(v === true);
          }}
        />
        가상 학생이 빨리 행동하기
      </label>
    </Card>
  );
}

function RoleCountsPanel({ session }: { session: HostSession }) {
  const E = session.engine;
  const n = session.state.players.length;
  const t = E.roleTotal();
  return (
    <Card>
      <CardHeader>
        <CardTitle>역할 인원</CardTitle>
        <span className={cn('tnum font-bold', t === n ? 'text-good' : 'text-warn')}>
          합계 {t} / 참여 {n}
        </span>
      </CardHeader>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
        {ROLE_ORDER.map((k) => (
          <div key={k} className="flex items-center justify-between gap-1.5 rounded-lg bg-secondary px-2 py-1.5">
            <b className="font-medium">{ROLE[k].name}</b>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="bg-card" aria-label={`${ROLE[k].name} 줄이기`} onClick={() => E.setCount(k, -1)}>
                <Minus />
              </Button>
              <span className="tnum min-w-[22px] text-center">{session.state.counts[k] || 0}</span>
              <Button size="icon" variant="outline" className="bg-card" aria-label={`${ROLE[k].name} 늘리기`} onClick={() => E.setCount(k, 1)}>
                <Plus />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Button onClick={() => E.fillCitizens()}>남는 인원을 일반시민으로 채우기</Button>
    </Card>
  );
}

function QuizPanel({ session }: { session: HostSession }) {
  const E = session.engine;
  const S = session.state;
  return (
    <Card>
      <CardHeader>
        <CardTitle>밤 퀴즈</CardTitle>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={S.quizOn} onCheckedChange={(v) => E.setQuizOn(v === true)} /> 사용
        </label>
      </CardHeader>
      <p className="text-sm text-muted-foreground">
        한 줄에 한 문제씩, <b>문제 / 정답 / 오답 / 오답</b> 순서로 적어요. 밤마다 한 문제씩 나와요. 지금 들어 있는 문제는 예시예요.
      </p>
      <Textarea value={S.quizText} disabled={!S.quizOn} onChange={(e) => E.setQuizText(e.target.value)} aria-label="밤 퀴즈 문제" />
    </Card>
  );
}

function StartPanel({ session }: { session: HostSession }) {
  const probs = session.engine.startProblems();
  return (
    <Card>
      {probs.length ? (
        <Msg error>
          {probs.map((p) => (
            <span key={p} className="block">
              {p}
            </span>
          ))}
        </Msg>
      ) : (
        <Msg>준비가 끝났어요. 시작하면 역할이 무작위로 배정돼요.</Msg>
      )}
      <Button variant="default" size="lg" disabled={probs.length > 0 || session.moved} onClick={() => session.engine.startGame()}>
        게임 시작
      </Button>
    </Card>
  );
}
