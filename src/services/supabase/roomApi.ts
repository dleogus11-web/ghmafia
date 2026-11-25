/* =========================================================================
   rooms 서비스 — Supabase 구현 (supabase/migrations/20261125000000_rooms.sql 과 짝)
   - 교사(로그인 사용자)는 RLS 로 자기 방만 읽고 씀
   - 학생(비로그인)은 room_exists RPC 만 호출
   ========================================================================= */
import type { PostgrestError } from '@supabase/supabase-js';
import type { GameState, OpenRoomRequest, OpenRoomResponse, RoomService, RoomSummary, SaveRoomRequest } from '@/types';
import { ServiceError } from '@/lib/errors';
import { getSupabase } from './client';

type SummaryRow = { code: string; phase: RoomSummary['phase']; player_count: number; round: number; updated_at: string };
const SUMMARY_COLS = 'code, phase, player_count, round, updated_at';

const toSummary = (r: SummaryRow): RoomSummary => ({
  code: r.code, phase: r.phase, playerCount: r.player_count, round: r.round, updatedAt: r.updated_at,
});

const columnsFrom = (state: GameState) => ({ phase: state.phase, player_count: state.players.length, round: state.round });

function toError(e: PostgrestError): ServiceError {
  if (e.code === '42501' || e.code === 'PGRST301' || /jwt|permission|row-level security/i.test(e.message)) {
    return new ServiceError('unauthorized', e.message);
  }
  return new ServiceError('network', e.message);
}

export const supabaseRoomApi: RoomService = {
  async openRoom(req: OpenRoomRequest): Promise<OpenRoomResponse> {
    const sb = getSupabase();
    const { error } = await sb.from('rooms').insert({ code: req.code, state: req.state, ...columnsFrom(req.state) });
    if (!error) {
      return { ok: true, room: { code: req.code, ...columnsFromSummary(req.state), updatedAt: new Date().toISOString() } };
    }
    if (error.code === '23505') {
      // 이미 있는 코드: 내 방이면(RLS 로 보임) 그대로 사용, 아니면 taken
      const { data, error: e2 } = await sb.from('rooms').select(SUMMARY_COLS).eq('code', req.code).maybeSingle<SummaryRow>();
      if (e2) throw toError(e2);
      return data ? { ok: true, room: toSummary(data) } : { ok: false, reason: 'taken' };
    }
    throw toError(error);
  },

  async saveRoom(req: SaveRoomRequest): Promise<void> {
    const { error } = await getSupabase().from('rooms').update({ state: req.state, ...columnsFrom(req.state) }).eq('code', req.code);
    if (error) throw toError(error);
  },

  async loadRoom(code: string): Promise<GameState | null> {
    const { data, error } = await getSupabase().from('rooms').select('state').eq('code', code).maybeSingle<{ state: GameState }>();
    if (error) throw toError(error);
    return data?.state && data.state.v === 1 ? data.state : null;
  },

  async listMyRooms(): Promise<RoomSummary[]> {
    const { data, error } = await getSupabase()
      .from('rooms')
      .select(SUMMARY_COLS)
      .neq('phase', 'end')
      .order('updated_at', { ascending: false })
      .limit(10)
      .returns<SummaryRow[]>();
    if (error) throw toError(error);
    return (data ?? []).map(toSummary);
  },

  async roomExists(code: string): Promise<boolean> {
    const { data, error } = await getSupabase().rpc('room_exists', { p_code: code });
    if (error) throw toError(error);
    return data === true;
  },
};

function columnsFromSummary(state: GameState) {
  return { phase: state.phase, playerCount: state.players.length, round: state.round };
}
