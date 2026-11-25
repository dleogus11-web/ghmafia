import type { Phase } from '@/types';

export const MAX_ROUND = 8;
export const MIN_PLAYERS = 4;
export const MAX_BOTS = 40;

/** 실시간 채널 이름 앞부분 */
export const CHANNEL_PREFIX = 'kr-classmafia-';

/** 학생 생존 신호 간격 / 이 시간 동안 소식 없으면 연결 끊김 처리 */
export const PING_MS = 10_000;
export const LOST_MS = 35_000;

/** 학생 화면 전송 묶음 간격, DB 저장 간격 */
export const VIEW_THROTTLE_MS = 250;
export const SAVE_THROTTLE_MS = 2_500;

/** 이 시간보다 오래 저장되지 않은 방은 학생에게 "없는 방" */
export const ROOM_TTL_HOURS = 12;

export const PHASE_LABEL: Record<Phase, string> = {
  lobby: '대기실',
  roles: '역할 확인',
  night: '밤',
  day: '낮 · 토론',
  vote: '낮 · 투표',
  terror: '낮 · 테러리스트',
  dayEnd: '낮 · 투표 결과',
  end: '게임 종료',
};
