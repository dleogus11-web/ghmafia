/* =========================================================================
   게임 도메인 타입
   - GameState 는 rooms.state(jsonb) 컬럼에 그대로 저장됩니다.
   - StudentView 는 교사 기기 → 학생 기기로 보내는 "그 학생만의 화면" 입니다.
   ========================================================================= */

export type RoleId =
  | 'mafia' | 'rat' | 'citizen' | 'doctor' | 'police'
  | 'soldier' | 'priest' | 'medium' | 'terrorist' | 'politician';

export type TeamId = 'mafia' | 'citizen' | 'rat';

export type Phase = 'lobby' | 'roles' | 'night' | 'day' | 'vote' | 'terror' | 'dayEnd' | 'end';

export type RoleCounts = Record<RoleId, number>;

export interface RoleDef {
  id: RoleId;
  name: string;
  team: TeamId;
  desc: string;
}

export interface PlayerAbilityUse {
  soldier: boolean;
  priest: boolean;
}

export interface Player {
  /** 학생 기기에 저장되는 재접속 토큰이기도 함 */
  id: string;
  name: string;
  /** 시험용 가상 학생 */
  bot: boolean;
  connected: boolean;
  role: RoleId | null;
  alive: boolean;
  used: PlayerAbilityUse;
  /** 경찰·영매 결과처럼 본인만 보는 정보 */
  notes: string[];
  quizScore: number;
  /** 밤에 의심 지목이 실제 마피아였던 횟수(추리왕) */
  hits: number;
  diedAt: string | null;
}

export type NightAct = 'kill' | 'heal' | 'inspect' | 'medium' | 'revive' | 'suspect' | 'suspect2';
export type TaskAct = NightAct | 'vote' | 'terror';

export interface NightPick {
  act: NightAct;
  /** 대상 player id 또는 '__skip' */
  target: string;
}

export interface Quiz {
  q: string;
  options: string[];
  /** options 안의 정답 위치 */
  answer: number;
}

export interface NightRevote {
  candidates: string[];
  picks: Record<string, NightPick>;
}

export interface NightState {
  stage: 'pick' | 'revote';
  deadAtStart: string[];
  quiz: Quiz | null;
  quizAns: Record<string, number>;
  picks: Record<string, NightPick>;
  revote: NightRevote | null;
}

export interface DayState {
  stage: 'vote' | 'revote';
  votes: Record<string, string>;
  candidates: string[] | null;
  terrorist: string | null;
}

export interface Announcement {
  title: string;
  lines: string[];
}

export interface GameState {
  v: 1;
  code: string;
  phase: Phase;
  round: number;
  players: Player[];
  counts: RoleCounts;
  quizOn: boolean;
  quizText: string;
  /** epoch ms, 토론 타이머 종료 시각 */
  timerEnd: number | null;
  log: string[];
  announce: Announcement | null;
  night: NightState | null;
  day: DayState | null;
  winner: TeamId | null;
  endReason: string;
}

/* ---------- 학생 화면 ---------- */

export interface TaskOption {
  id: string;
  label: string;
  wide?: boolean;
}

export interface Task {
  /** 같은 할 일을 두 번 제출하지 않도록 쓰는 키 (예: n3, q3, v3vote) */
  key: string;
  type: 'pick' | 'quiz';
  act?: TaskAct;
  prompt: string;
  question?: string;
  options: TaskOption[];
}

export interface AwardWinner {
  names: string[];
  n: number;
}

export interface Awards {
  detective: AwardWinner | null;
  quiz: AwardWinner | null;
}

export interface EndRow {
  name: string;
  role: string;
  team: TeamId;
  alive: boolean;
  win: boolean;
}

export interface StudentSelf {
  name: string;
  alive: boolean;
  diedAt: string | null;
  role: RoleId | null;
  roleName: string | null;
  team: TeamId | null;
  teamName: string | null;
  desc: string | null;
  notes: string[];
  teammates: string[];
  used: PlayerAbilityUse;
}

export interface StudentView {
  phase: Phase;
  phaseLabel: string;
  round: number;
  maxRound: number;
  code: string;
  timerEnd: number | null;
  me: StudentSelf;
  announce: Announcement | null;
  task: Task | null;
  lobby: string[] | null;
  aliveList: { name: string; alive: boolean }[] | null;
  end: {
    winner: TeamId;
    winnerName: string;
    reason: string;
    awards: Awards;
    rows: EndRow[];
  } | null;
}
