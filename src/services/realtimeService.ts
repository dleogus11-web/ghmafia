/* =========================================================================
   실시간 연결 서비스 — 교사 ↔ 학생 메시지 전달
   VITE_BACKEND 값에 따라 mock(BroadcastChannel) 또는 supabase(Realtime Broadcast)
   ========================================================================= */
import type { RealtimeService } from '@/types';
import { isMock } from '@/lib/env';
import { mockRealtime } from '@/mocks/mockRealtime';

let impl: Promise<RealtimeService> | null = null;
const load = (): Promise<RealtimeService> =>
  (impl ??= isMock ? Promise.resolve(mockRealtime) : import('./supabase/realtime').then((m) => m.supabaseRealtime));

export const realtimeService: RealtimeService = {
  createHost: (code, h) => load().then((s) => s.createHost(code, h)),
  createClient: (code, h) => load().then((s) => s.createClient(code, h)),
};
