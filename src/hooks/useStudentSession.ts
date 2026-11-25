import { useEffect, useReducer, useState } from 'react';
import { StudentSession } from '@/lib/game/studentSession';
import { realtimeService } from '@/services/realtimeService';
import { roomService } from '@/services/roomService';
import { isMock } from '@/lib/env';
import { localStore, sessionStore } from '@/lib/storage';

/** 학생 화면용. mock 모드에서는 탭마다 다른 학생이 되도록 sessionStorage 에 토큰 저장 */
export function useStudentSession(code: string | undefined, name: string | undefined): StudentSession | null {
  const [session, setSession] = useState<StudentSession | null>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    if (!code || !name) return;
    const s = new StudentSession(code, name, {
      realtime: realtimeService,
      rooms: roomService,
      tokenStore: isMock ? sessionStore : localStore,
    });
    const off = s.subscribe(rerender);
    setSession(s);
    s.start();
    return () => {
      off();
      s.destroy();
      setSession(null);
    };
  }, [code, name]);

  return session;
}
