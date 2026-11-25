/* =========================================================================
   rooms 데이터 서비스 — UI·훅은 이 파일만 import 합니다.
   VITE_BACKEND 값에 따라 mock 또는 supabase 구현으로 연결됩니다.
   함수 시그니처(RoomService)는 두 구현이 똑같습니다.
   ========================================================================= */
import type { RoomService } from '@/types';
import { isMock } from '@/lib/env';
import { mockRoomApi } from '@/mocks/mockRoomApi';

let impl: Promise<RoomService> | null = null;
const load = (): Promise<RoomService> =>
  (impl ??= isMock ? Promise.resolve(mockRoomApi) : import('./supabase/roomApi').then((m) => m.supabaseRoomApi));

export const roomService: RoomService = {
  openRoom: (req) => load().then((s) => s.openRoom(req)),
  saveRoom: (req) => load().then((s) => s.saveRoom(req)),
  loadRoom: (code) => load().then((s) => s.loadRoom(code)),
  listMyRooms: () => load().then((s) => s.listMyRooms()),
  roomExists: (code) => load().then((s) => s.roomExists(code)),
};
