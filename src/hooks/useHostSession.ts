import { useEffect, useReducer, useRef, useState } from 'react';
import type { GameState } from '@/types';
import { HostSession } from '@/lib/game/hostSession';
import { realtimeService } from '@/services/realtimeService';
import { roomService } from '@/services/roomService';

/**
 * 교사 화면용: 방 코드당 HostSession 하나를 만들고, 상태가 바뀔 때마다 다시 그립니다.
 * initial 은 처음 한 번만 씁니다(이후 진행 상태는 세션이 들고 있음).
 */
export function useHostSession(code: string | undefined, initial: GameState | null | undefined): HostSession | null {
  const [session, setSession] = useState<HostSession | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const ready = !!initial;

  useEffect(() => {
    const init = initialRef.current;
    if (!code || !init) return;
    const s = new HostSession(structuredClone(init), { realtime: realtimeService, rooms: roomService });
    const off = s.subscribe(rerender);
    setSession(s);
    void s.start();
    return () => {
      off();
      s.destroy();
      setSession(null);
    };
  }, [code, ready]);

  return session;
}
