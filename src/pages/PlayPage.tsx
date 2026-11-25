import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import type { StudentStatus } from '@/lib/game/studentSession';
import { useStudentSession } from '@/hooks/useStudentSession';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { localStore } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnnounceCard } from '@/components/common/AnnounceCard';
import { Msg } from '@/components/common/StatusCards';
import { RoleCard } from '@/components/student/RoleCard';
import { TaskPanel } from '@/components/student/TaskPanel';
import { DeadBanner, NameChips, NotesCard, StudentEnd, StudentStatusBar, WaitingCard } from '@/components/student/StudentPanels';
import { NAME_KEY } from './HomePage';

const STATUS_TEXT: Record<StudentStatus, string> = {
  connecting: '방에 연결하는 중…',
  open: '선생님 기기의 답을 기다리는 중…',
  lost: '연결이 끊겼어요. 다시 연결하는 중…',
  noroom: '방을 찾을 수 없어요. 코드를 확인하거나, 선생님이 방을 열었는지 확인해 주세요. 다시 시도하는 중…',
  lib: '연결 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 새로고침해 주세요.',
  config: '아직 서버 설정이 안 되어 있어요. 선생님께 말씀해 주세요.',
  refused: '',
};

/** /play/:code — 학생 휴대폰 화면 */
export default function PlayPage() {
  const { code: rawCode } = useParams({ strict: false }) as { code?: string };
  const code = (rawCode ?? '').replace(/\D/g, '').slice(0, 6);
  const [name, setName] = useState<string | undefined>(
    () => localStore.get<string>(NAME_KEY) ?? undefined,
  );
  const session = useStudentSession(code.length === 6 ? code : undefined, name);
  const v = session?.view ?? null;
  useTimeOfDay(!name || v?.phase === 'night' ? 'night' : 'day');

  if (!name) return <NameForm code={code} onDone={setName} />;

  const wrap = (children: ReactNode) => <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4">{children}</main>;

  if (!session || !v) {
    return wrap(
      <Card>
        <div className="eyebrow">방 {code}</div>
        <h2 className="text-[1.45rem]">{name}</h2>
        {session?.err ? (
          <>
            <Msg error>{session.err}</Msg>
            <Button asChild>
              <Link to="/">처음으로</Link>
            </Button>
          </>
        ) : (
          <Msg>{STATUS_TEXT[session?.status ?? 'connecting']}</Msg>
        )}
      </Card>,
    );
  }

  const lost = session.status === 'lost' ? <Msg error className="text-sm">연결이 끊겼어요. 다시 연결하는 중…</Msg> : null;
  const me = v.me;

  if (v.phase === 'lobby') {
    return wrap(
      <>
        <StudentStatusBar view={v} />
        {lost}
        <Card>
          <h2 className="text-[1.45rem]">대기실에 들어왔어요</h2>
          <p className="text-muted-foreground">선생님이 게임을 시작하면 역할이 정해져요.</p>
          <NameChips names={(v.lobby ?? []).map((n) => ({ name: n, alive: true }))} />
        </Card>
      </>,
    );
  }

  if (v.phase === 'end') {
    return wrap(
      <>
        <StudentStatusBar view={v} />
        <StudentEnd view={v} />
      </>,
    );
  }

  let task: ReactNode = null;
  if (!me.alive) task = <DeadBanner diedAt={me.diedAt} />;
  else if (v.task) task = <TaskPanel task={v.task} onSubmit={(k, val) => session.submit(k, val)} />;
  else if (['night', 'vote', 'terror'].includes(v.phase)) task = <WaitingCard />;
  else if (v.phase === 'roles') task = <Msg>선생님이 밤을 시작할 때까지 기다려 주세요.</Msg>;
  else if (v.phase === 'day') task = <Msg>자유롭게 토론하세요. 선생님이 투표를 시작하면 여기에 투표 화면이 나와요.</Msg>;

  return wrap(
    <>
      <StudentStatusBar view={v} />
      {lost}
      <RoleCard me={me} />
      <AnnounceCard announce={v.announce} />
      {task}
      <NotesCard notes={me.notes} />
      {v.aliveList && (
        <Card>
          <div className="eyebrow">참가자</div>
          <NameChips names={v.aliveList} />
        </Card>
      )}
    </>,
  );
}

/** 링크(/play/123456)로 바로 들어와 이름이 없을 때 */
function NameForm({ code, onDone }: { code: string; onDone(name: string): void }) {
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr('이름을 입력해 주세요.');
    localStore.set(NAME_KEY, n);
    onDone(n);
  };
  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4 pt-[6vh]">
      <Card>
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="eyebrow">방 {code}</div>
          <h2 className="text-[1.45rem]">이름을 알려 주세요</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pname">내 이름</Label>
            <Input id="pname" maxLength={12} autoComplete="off" autoFocus placeholder="예: 김하늘" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {err && <Msg error>{err}</Msg>}
          <Button type="submit" variant="default" size="lg">
            참여하기
          </Button>
        </form>
      </Card>
    </main>
  );
}
