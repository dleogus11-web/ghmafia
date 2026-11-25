import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useRoomState } from '@/hooks/useRoomQueries';
import { useHostSession } from '@/hooks/useHostSession';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppHeader } from '@/components/common/AppHeader';
import { LoadingCard, Msg } from '@/components/common/StatusCards';
import { HostTopbar, type ArmId } from '@/components/host/HostTopbar';
import { LobbyPanels } from '@/components/host/LobbyPanels';
import { GamePanels } from '@/components/host/GamePanels';

/** /host/:code — 교사 진행 화면(프로젝터/PC) */
export default function HostRoomPage() {
  const { code } = useParams({ strict: false }) as { code?: string };
  const room = useRoomState(code);
  const session = useHostSession(code, room.data);
  const [hideRoles, setHideRoles] = useState(false);
  const [armed, setArmed] = useState<ArmId | null>(null);
  const armTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useTimeOfDay(session?.state.phase === 'night' ? 'night' : 'day');
  useEffect(() => () => clearTimeout(armTimer.current), []);

  const armOrRun = useCallback(
    (id: ArmId, n: number, fn: () => void) => {
      if (n > 0 && armed !== id) {
        setArmed(id);
        clearTimeout(armTimer.current);
        armTimer.current = setTimeout(() => setArmed((a) => (a === id ? null : a)), 4000);
        return;
      }
      setArmed(null);
      fn();
    },
    [armed],
  );

  if (room.isLoading) return <LoadingCard text="게임방을 불러오는 중…" />;
  if (room.isError || room.data === null) {
    return (
      <main className="mx-auto flex w-full max-w-[460px] flex-col gap-4 pt-[8vh]">
        <Card>
          <h2 className="text-[1.45rem]">방을 열 수 없어요</h2>
          <Msg error>{room.isError ? '서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.' : `방 ${code}을(를) 찾을 수 없거나 내 방이 아니에요.`}</Msg>
          <Button asChild variant="default">
            <Link to="/host">게임방 목록으로</Link>
          </Button>
        </Card>
      </main>
    );
  }
  if (!session) return <LoadingCard text="연결 준비 중…" />;

  return (
    <main className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <AppHeader />
      <HostTopbar session={session} armed={armed} armOrRun={armOrRun} />
      {session.moved && (
        <Msg error>
          다른 기기에서 이 게임을 이어받았어요. 이 화면에서는 더 이상 진행되지 않아요. <Link to="/host" className="underline">게임방 목록</Link>
        </Msg>
      )}
      {session.state.phase === 'lobby' ? (
        <LobbyPanels session={session} />
      ) : (
        <GamePanels session={session} hideRoles={hideRoles} setHideRoles={setHideRoles} />
      )}
    </main>
  );
}
