/* =========================================================================
   Mock rooms 테이블 — localStorage 에 RoomRow[] 를 저장하고 RLS 를 흉내냅니다.
   실제 연동 시: src/services/supabase/roomApi.ts + supabase/migrations/*.sql
   ========================================================================= */
import type { GameState, OpenRoomRequest, OpenRoomResponse, RoomRow, RoomService, RoomSummary, SaveRoomRequest } from '@/types';
import { localStore } from '@/lib/storage';
import { ServiceError } from '@/lib/errors';
import { uid } from '@/lib/random';
import { ROOM_TTL_HOURS } from '@/lib/game/constants';
import { delay } from './delay';
import { mockCurrentUserId } from './mockAuthApi';

const KEY = 'mock-db-rooms';
const rows = (): RoomRow[] => localStore.get<RoomRow[]>(KEY) ?? [];
const write = (r: RoomRow[]) => localStore.set(KEY, r);

const requireUser = (): string => {
  const id = mockCurrentUserId();
  if (!id) throw new ServiceError('unauthorized', '로그인이 필요해요.');
  return id;
};

const summary = (r: RoomRow): RoomSummary => ({
  code: r.code, phase: r.phase, playerCount: r.player_count, round: r.round, updatedAt: r.updated_at,
});

const columnsFrom = (state: GameState) => ({
  phase: state.phase, player_count: state.players.length, round: state.round,
});

export const mockRoomApi: RoomService = {
  async openRoom(req: OpenRoomRequest): Promise<OpenRoomResponse> {
    await delay();
    const me = requireUser();
    const all = rows();
    const found = all.find((r) => r.code === req.code);
    if (found) return found.owner_id === me ? { ok: true, room: summary(found) } : { ok: false, reason: 'taken' };
    const now = new Date().toISOString();
    const row: RoomRow = { id: uid(), code: req.code, owner_id: me, state: req.state, ...columnsFrom(req.state), created_at: now, updated_at: now };
    write([...all, row]);
    return { ok: true, room: summary(row) };
  },

  async saveRoom(req: SaveRoomRequest): Promise<void> {
    await delay(60, 160);
    const me = requireUser();
    const all = rows();
    const r = all.find((x) => x.code === req.code && x.owner_id === me);
    if (!r) return;
    Object.assign(r, { state: req.state, ...columnsFrom(req.state), updated_at: new Date().toISOString() });
    write(all);
  },

  async loadRoom(code: string): Promise<GameState | null> {
    await delay();
    const me = requireUser();
    return rows().find((r) => r.code === code && r.owner_id === me)?.state ?? null;
  },

  async listMyRooms(): Promise<RoomSummary[]> {
    await delay();
    const me = requireUser();
    return rows()
      .filter((r) => r.owner_id === me && r.phase !== 'end')
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 10)
      .map(summary);
  },

  async roomExists(code: string): Promise<boolean> {
    await delay(80, 200);
    const cutoff = Date.now() - ROOM_TTL_HOURS * 3600_000;
    return rows().some((r) => r.code === code && new Date(r.updated_at).getTime() > cutoff);
  },
};
