/* =========================================================================
   rooms 관련 React Query 훅 — 화면은 이 훅만 쓰고 services 를 직접 부르지 않습니다.
   ========================================================================= */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roomService } from '@/services/roomService';
import { GameEngine } from '@/lib/game/engine';
import { roomCode } from '@/lib/random';

export const roomKeys = {
  mine: ['rooms', 'mine'] as const,
  state: (code: string) => ['rooms', 'state', code] as const,
};

/** 내가 만든 진행 중인 방 */
export function useMyRooms() {
  return useQuery({ queryKey: roomKeys.mine, queryFn: () => roomService.listMyRooms() });
}

/** 방 상태 1회 불러오기 — 이후 진행은 HostSession 이 들고 있으므로 다시 불러오지 않음 */
export function useRoomState(code: string | undefined) {
  return useQuery({
    queryKey: roomKeys.state(code ?? ''),
    queryFn: () => roomService.loadRoom(code!),
    enabled: !!code,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });
}

/** 새 게임방 만들기 — 비어 있는 방 코드를 찾을 때까지 몇 번 시도 */
export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      for (let i = 0; i < 6; i++) {
        const code = roomCode();
        const res = await roomService.openRoom({ code, state: GameEngine.newState(code) });
        if (res.ok) return res.room;
      }
      throw new Error('비어 있는 방 코드를 찾지 못했어요. 다시 시도해 주세요.');
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: roomKeys.mine }),
  });
}
