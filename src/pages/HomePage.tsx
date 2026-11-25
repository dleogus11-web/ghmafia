import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Moon, Msg } from '@/components/common/StatusCards';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { localStore } from '@/lib/storage';
import { isMock } from '@/lib/env';

export const NAME_KEY = 'mafia-name';

export default function HomePage() {
  useTimeOfDay('night');
  const navigate = useNavigate();
  const [code, setCode] = useState(() => (new URLSearchParams(window.location.search).get('room') ?? '').replace(/\D/g, '').slice(0, 6));
  const [name, setName] = useState(() => localStore.get<string>(NAME_KEY) ?? '');
  const [err, setErr] = useState('');

  const join = (e: FormEvent) => {
    e.preventDefault();
    const c = code.replace(/\D/g, '');
    const n = name.trim();
    if (c.length !== 6) return setErr('방 코드 6자리를 입력해 주세요.');
    if (!n) return setErr('이름을 입력해 주세요.');
    localStore.set(NAME_KEY, n);
    navigate({ to: '/play/$code', params: { code: c } });
  };

  return (
    <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4">
      <div className="flex flex-col gap-2 pt-[4vh]">
        <Moon />
        <h1 className="text-[2.8rem] leading-tight">교실 마피아</h1>
        <p className="text-muted-foreground">밤에는 각자 휴대폰으로 미션을, 낮에는 교실에서 토론과 투표를.</p>
      </div>

      <Card>
        <form className="flex flex-col gap-3" onSubmit={join} noValidate>
          <h2 className="text-[1.45rem]">학생으로 참여하기</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jcode">방 코드 6자리</Label>
            <Input
              id="jcode"
              inputMode="numeric"
              maxLength={6}
              autoComplete="off"
              placeholder="선생님 화면에 있는 숫자"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="jname">내 이름</Label>
            <Input id="jname" maxLength={12} autoComplete="off" placeholder="예: 김하늘" value={name} onChange={(e) => setName(e.target.value)} autoFocus={!!code} />
          </div>
          {err && <Msg error>{err}</Msg>}
          <Button type="submit" variant="default" size="lg">
            참여하기
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-[1.45rem]">선생님</h2>
        <p className="text-sm text-muted-foreground">
          로그인하면 게임방을 만들고, 진행 중인 방을 다른 기기에서 이어서 할 수 있어요. 게임 중에는 교사 화면을 켜 두세요.
        </p>
        <Button asChild variant="default" className="self-start">
          <Link to="/host">게임방 만들기 · 이어하기</Link>
        </Button>
      </Card>

      {isMock && <p className="text-sm text-muted-foreground">목업 모드: 서버 없이 이 브라우저의 탭끼리만 연결돼요. 교사 탭 하나, 학생 탭 여러 개로 시험해 보세요.</p>}
    </main>
  );
}
