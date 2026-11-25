/* =========================================================================
   rooms 테이블 타입 (supabase/migrations 의 SQL 과 1:1)
   ========================================================================= */
import type { GameState, Phase } from './game';

/** DB Entity: public.rooms 한 행 */
export interface RoomRow {
  id: string;
  code: string;
  owner_id: string;
  state: GameState;
  phase: Phase;
  player_count: number;
  round: number;
  created_at: string;
  updated_at: string;
}

/* ---------- Request DTO ---------- */

export interface OpenRoomRequest {
  code: string;
  state: GameState;
}

export interface SaveRoomRequest {
  code: string;
  state: GameState;
}

/* ---------- Response DTO ---------- */

export type OpenRoomResponse =
  | { ok: true; room: RoomSummary }
  | { ok: false; reason: 'taken' };

/** 교사 "내 게임방" 목록에 쓰는 요약 */
export interface RoomSummary {
  code: string;
  phase: Phase;
  playerCount: number;
  round: number;
  updatedAt: string;
}

/* ---------- Service 인터페이스 ---------- */

export interface RoomService {
  /** 새 방을 만든다. 이미 내 방이면 ok, 다른 교사 방이면 taken */
  openRoom(req: OpenRoomRequest): Promise<OpenRoomResponse>;
  /** 게임 상태 저장(교사 화면이 자동 호출, 내 방만 가능) */
  saveRoom(req: SaveRoomRequest): Promise<void>;
  /** 내 방의 게임 상태 불러오기. 없거나 내 방이 아니면 null */
  loadRoom(code: string): Promise<GameState | null>;
  /** 내가 만든 진행 중인 방 목록(최근 순) */
  listMyRooms(): Promise<RoomSummary[]>;
  /** 학생용: 방이 열려 있는지만 확인(로그인 불필요) */
  roomExists(code: string): Promise<boolean>;
}
