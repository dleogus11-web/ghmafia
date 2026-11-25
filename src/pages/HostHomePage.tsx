import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useCreateRoom, useMyRooms } from '@/hooks/useRoomQueries';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import { PHASE_LABEL } from '@/lib/game/constants';
import { formatRelativeKo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { AppHeader } from '@/components/common/AppHeader';
import { Msg, PulseDot } from '@/components/common/StatusCards';

/** /host — 새 방 만들기 + 내 진행 중인 방(다른 기기에서 이어하기) */
export default function HostHomePage() {
  useTimeOfDay('day');
  const navigate = useNavigate();
  const rooms = useMyRooms();
  const create = useCreateRoom();

  const newRoom = () =>
    create.mutate(undefined, {
      onSuccess: (room) => navigate({ to: '/host/$code', params: { code: room.code } }),
      onError: (e) => toast.error(e instanceof Error ? e.message : '방을 만들지 못했어요.'),
    });

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <AppHeader />
      <Card>
        <h1 className="text-[2rem]">게임방</h1>
        <p className="text-sm text-muted-foreground">이 기기가 게임 진행을 맡아요. 게임이 끝날 때까지 이 화면을 켜 두세요. 진행 상황은 자동으로 저장돼요.</p>
        <Button variant="default" size="lg" className="self-start" disabled={create.isPending} onClick={newRoom}>
          {create.isPending ? '방 만드는 중…' : '새 게임방 만들기'}
        </Button>
      </Card>

      <Card>
        <CardTitle>진행 중인 내 방</CardTitle>
        <p className="text-sm text-muted-foreground">다른 기기에서 열면 그 기기로 진행이 넘어가고, 원래 화면은 자동으로 멈춰요. 학생들은 다시 들어올 필요 없어요.</p>
        {rooms.isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <PulseDot /> 불러오는 중…
          </div>
        )}
        {rooms.isError && <Msg error>방 목록을 불러오지 못했어요. 새로고침해 주세요.</Msg>}
        {rooms.data && rooms.data.length === 0 && <p className="text-muted-foreground">아직 없어요.</p>}
        {rooms.data && rooms.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {rooms.data.map((r) => (
              <li key={r.code} className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary px-3 py-2">
                <span className="tnum font-display text-xl tracking-[0.12em]">{r.code}</span>
                <span className="text-sm">
                  {PHASE_LABEL[r.phase]}
                  {r.round ? ` · ${r.round}라운드` : ''} · {r.playerCount}명
                </span>
                <span className="text-sm text-muted-foreground">{formatRelativeKo(r.updatedAt)}</span>
                <div className="flex-1" />
                <Button size="sm" onClick={() => navigate({ to: '/host/$code', params: { code: r.code } })}>
                  이어하기
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </main>
  );
}
