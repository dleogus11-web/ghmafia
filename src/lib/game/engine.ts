/* =========================================================================
   게임 엔진 — 교사(호스트) 기기에서만 돌아가는 규칙 계산
   DOM·네트워크·저장소를 모릅니다. 상태(GameState)를 바꾸고 subscribe 로 알릴 뿐.
   원본 HTML 의 규칙을 그대로 옮겼습니다.
   ========================================================================= */
import type {
  Awards, GameState, NightPick, Player, RoleCounts, RoleId, StudentView, Task, TaskOption, TeamId,
} from '@/types';
import { pickOne, rand, shuffle, uid } from '@/lib/random';
import { MAX_ROUND, MIN_PLAYERS, PHASE_LABEL } from './constants';
import { makeName } from './names';
import { parseQuiz, SAMPLE_QUIZ } from './quiz';
import { defaultCounts, ROLE, ROLE_ORDER, TEAM_NAME } from './roles';

export type JoinResult = { ok: true; player: Player } | { ok: false; error: string };

const isMafia = (p: Player | undefined | null): boolean => !!p && !!p.role && ROLE[p.role].team === 'mafia';
const opt = (p: Player): TaskOption => ({ id: p.id, label: p.name });

export class GameEngine {
  s: GameState;
  /** 가상 학생이 빨리 행동 */
  fastBots = false;

  private listeners = new Set<() => void>();
  private queued = false;
  private disposed = false;
  private botPlan = new Map<string, string>();
  private botTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(state: GameState) {
    this.s = state;
  }

  static newState(code: string): GameState {
    return {
      v: 1, code, phase: 'lobby', round: 0, players: [], counts: defaultCounts(), quizOn: true, quizText: SAMPLE_QUIZ,
      timerEnd: null, log: [], announce: null, night: null, day: null, winner: null, endReason: '',
    };
  }

  /* ---------- 변경 알림 ---------- */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
    this.botTimers.forEach(clearTimeout);
    this.botTimers.clear();
  }
  changed() {
    if (this.queued || this.disposed) return;
    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      if (this.disposed) return;
      this.runBots();
      this.listeners.forEach((f) => f());
    });
  }

  /* ---------- 조회 ---------- */
  P = (id: string | null | undefined): Player | undefined => (id ? this.s.players.find((p) => p.id === id) : undefined);
  alive = (): Player[] => this.s.players.filter((p) => p.alive);
  nameOf = (id: string): string => this.P(id)?.name ?? '?';
  isMafia = isMafia;
  roleTotal = (): number => ROLE_ORDER.reduce((a, k) => a + (this.s.counts[k] || 0), 0);

  private addLog(text: string) {
    this.s.log.unshift(text);
    if (this.s.log.length > 200) this.s.log.length = 200;
  }

  /* ---------- 플레이어 관리 ---------- */
  addPlayer({ name, bot }: { name: string; bot: boolean }): Player {
    const p: Player = {
      id: uid(), name, bot, connected: bot, role: null, alive: true, used: { soldier: false, priest: false },
      notes: [], quizScore: 0, hits: 0, diedAt: null,
    };
    this.s.players.push(p);
    return p;
  }
  addBots(n: number) {
    const taken = new Set(this.s.players.map((p) => p.name));
    for (let i = 0; i < n; i++) {
      const nm = makeName(taken);
      taken.add(nm);
      this.addPlayer({ name: nm, bot: true });
    }
    this.changed();
  }
  /** 대기실에서만. 실제 학생 연결 정리는 HostSession 이 함 */
  removePlayer(id: string): boolean {
    if (this.s.phase !== 'lobby') return false;
    this.s.players = this.s.players.filter((p) => p.id !== id);
    this.changed();
    return true;
  }
  clearBots() {
    if (this.s.phase !== 'lobby') return;
    this.s.players = this.s.players.filter((p) => !p.bot);
    this.changed();
  }
  join(nameRaw: string, token: string | null): JoinResult {
    const name = String(nameRaw || '').trim().slice(0, 12);
    let p = token ? this.P(token) : undefined;
    if (!p) {
      if (this.s.phase !== 'lobby') return { ok: false, error: '게임이 이미 시작되었어요. 선생님께 말씀해 주세요.' };
      if (!name) return { ok: false, error: '이름을 입력해 주세요.' };
      if (this.s.players.some((x) => x.name === name)) return { ok: false, error: '같은 이름이 이미 있어요. 다른 이름을 써 주세요.' };
      p = this.addPlayer({ name, bot: false });
    }
    p.connected = true;
    this.changed();
    return { ok: true, player: p };
  }
  setConnected(pid: string, connected: boolean) {
    const p = this.P(pid);
    if (p && p.connected !== connected) {
      p.connected = connected;
      this.changed();
    }
  }

  /* ---------- 설정 ---------- */
  setCount(role: RoleId, delta: number) {
    this.s.counts[role] = Math.max(0, Math.min(40, (this.s.counts[role] || 0) + delta));
    this.changed();
  }
  fillCitizens() {
    const others = this.roleTotal() - this.s.counts.citizen;
    this.s.counts.citizen = Math.max(0, this.s.players.length - others);
    this.changed();
  }
  autoFill() {
    const n = this.s.players.length;
    if (n < MIN_PLAYERS) return;
    const c: RoleCounts = {
      mafia: Math.max(1, Math.round(n / 5)), rat: n >= 12 ? 2 : 1, citizen: 0, doctor: 1, police: 1,
      soldier: n >= 8 ? 1 : 0, priest: n >= 10 ? 1 : 0, medium: n >= 12 ? 1 : 0, terrorist: n >= 14 ? 1 : 0, politician: n >= 16 ? 1 : 0,
    };
    const sum = () => ROLE_ORDER.reduce((a, k) => a + c[k], 0);
    c.citizen = Math.max(0, n - sum());
    while (sum() > n) {
      for (const k of ['politician', 'terrorist', 'medium', 'priest', 'soldier', 'police'] as RoleId[]) {
        if (c[k]) { c[k]--; break; }
      }
    }
    this.s.counts = c;
    this.changed();
  }
  setQuizOn(on: boolean) { this.s.quizOn = on; this.changed(); }
  setQuizText(text: string) { this.s.quizText = text; this.changed(); }
  setTimer(min: number) { this.s.timerEnd = min ? Date.now() + min * 60000 : null; this.changed(); }

  /* ---------- 할 일(task): 학생 화면과 가상 학생이 같은 함수를 씀 ---------- */
  private nightPickTask(p: Player): Task {
    const N = this.s.night!;
    const r = this.s.round;
    const al = this.alive();
    const others = al.filter((x) => x.id !== p.id);
    const deadStart = N.deadAtStart.map((id) => this.P(id)).filter((x): x is Player => !!x);
    const base = { key: 'n' + r, type: 'pick' as const };
    const suspect: Task = { ...base, act: 'suspect', prompt: '가장 의심되는 사람을 골라 주세요', options: others.map(opt) };
    switch (p.role) {
      case 'mafia': return { ...base, act: 'kill', prompt: '오늘 밤 탈락시킬 사람', options: al.filter((x) => !isMafia(x)).map(opt) };
      case 'doctor': return { ...base, act: 'heal', prompt: '오늘 밤 지켜 줄 사람', options: al.map(opt) };
      case 'police': return { ...base, act: 'inspect', prompt: '마피아인지 확인할 사람', options: others.map(opt) };
      case 'medium': return deadStart.length ? { ...base, act: 'medium', prompt: '직업을 확인할 탈락자', options: deadStart.map(opt) } : suspect;
      case 'priest':
        return !p.used.priest && deadStart.length
          ? { ...base, act: 'revive', prompt: '부활시킬 탈락자 (게임 중 한 번)', options: [...deadStart.map(opt), { id: '__skip', label: '오늘은 쓰지 않음', wide: true }] }
          : suspect;
      default: return suspect;
    }
  }

  taskFor(p: Player | undefined): Task | null {
    if (!p || !p.alive) return null;
    const S = this.s, r = S.round;
    if (S.phase === 'night' && S.night) {
      const N = S.night;
      if (N.stage === 'pick') {
        if (N.quiz && !(p.id in N.quizAns)) {
          return { key: 'q' + r, type: 'quiz', prompt: '오늘의 퀴즈', question: N.quiz.q, options: N.quiz.options.map((t, i) => ({ id: String(i), label: t })) };
        }
        if (!N.picks[p.id]) return this.nightPickTask(p);
        return null;
      }
      if (N.stage === 'revote' && N.revote) {
        if (N.revote.picks[p.id]) return null;
        const base = { key: 'nr' + r, type: 'pick' as const };
        if (isMafia(p)) {
          return { ...base, act: 'kill', prompt: '의견이 갈렸어요. 다시 골라 주세요', options: N.revote.candidates.map((id) => this.P(id)).filter((x): x is Player => !!x).map(opt) };
        }
        return { ...base, act: 'suspect2', prompt: '한 번 더, 가장 의심되는 사람', options: this.alive().filter((x) => x.id !== p.id).map(opt) };
      }
    }
    if (S.phase === 'vote' && S.day) {
      const D = S.day;
      if (p.id in D.votes) return null;
      const pool = D.stage === 'revote' && D.candidates ? D.candidates.map((id) => this.P(id)).filter((x): x is Player => !!x) : this.alive();
      return {
        key: 'v' + r + D.stage, type: 'pick', act: 'vote',
        prompt: D.stage === 'revote' ? '결선 투표 · 처형할 사람' : '처형할 사람에게 투표',
        options: pool.filter((x) => x.id !== p.id).map(opt),
      };
    }
    if (S.phase === 'terror' && S.day && S.day.terrorist === p.id) {
      return { key: 't' + r, type: 'pick', act: 'terror', prompt: '함께 탈락할 사람을 골라 주세요', options: this.alive().map(opt) };
    }
    return null;
  }

  pending = (): Player[] => this.alive().filter((p) => this.taskFor(p));

  /* ---------- 학생 행동 처리 ---------- */
  act(pid: string, key: string, value: string) {
    const S = this.s;
    const p = this.P(pid);
    const t = this.taskFor(p);
    if (!p || !t || t.key !== key) return;
    if (!t.options.some((o) => o.id === value)) return;
    const N = S.night;
    if (t.type === 'quiz' && N && N.quiz) {
      const idx = Number(value);
      N.quizAns[pid] = idx;
      if (idx === N.quiz.answer) p.quizScore++;
    } else if (t.act === 'vote' && S.day) {
      S.day.votes[pid] = value;
    } else if (t.act === 'terror') {
      const v = this.P(value);
      if (v && v.alive) { v.alive = false; v.diedAt = S.round + '일 낮'; }
      S.announce?.lines.push(`${p.name}님이 ${v ? v.name : '?'}님을 지목했어요. ${v ? v.name : '?'}님도 탈락했습니다.`);
      this.addLog(`${S.round}일 낮 · 테러리스트 ${p.name} → ${v ? v.name : '?'}(${v && v.role ? ROLE[v.role].name : ''}) 함께 탈락`);
      this.finishDay();
      return;
    } else if (N && N.stage === 'revote' && N.revote && key === 'nr' + S.round) {
      N.revote.picks[pid] = { act: t.act as NightPick['act'], target: value };
    } else if (N) {
      N.picks[pid] = { act: t.act as NightPick['act'], target: value };
    }
    // 밤 1차 지목이 모두 끝났는데 마피아 의견이 갈렸으면 자동으로 재지목
    if (S.phase === 'night' && N && N.stage === 'pick' && this.pending().length === 0) {
      const tl = this.mafiaTally(N.picks);
      if (tl.top.length > 1) this.startMafiaRevote(tl.top);
    }
    this.changed();
  }

  /* ---------- 진행: 시작 ---------- */
  startProblems(): string[] {
    const n = this.s.players.length, t = this.roleTotal(), c = this.s.counts;
    const out: string[] = [];
    if (n < MIN_PLAYERS) out.push(`${MIN_PLAYERS}명 이상이 들어와야 시작할 수 있어요.`);
    if (c.mafia < 1) out.push('마피아는 1명 이상이어야 해요.');
    if (c.rat < 1 || c.rat > 2) out.push('쥐인간은 1명 또는 2명이어야 해요.');
    if (t !== n) out.push(`역할 수 합계(${t})와 참여 인원(${n})이 달라요.`);
    const citizens = t - c.mafia - c.rat;
    if (c.mafia >= citizens && t === n) out.push('시작하자마자 마피아가 이기는 구성이에요. 시민팀을 늘려 주세요.');
    return out;
  }
  startGame() {
    if (this.startProblems().length) return;
    const S = this.s;
    const roles = shuffle(ROLE_ORDER.flatMap((k) => Array<RoleId>(S.counts[k] || 0).fill(k)));
    S.players = shuffle(S.players);
    S.players.forEach((p, i) => {
      p.role = roles[i]; p.alive = true; p.used = { soldier: false, priest: false }; p.notes = []; p.quizScore = 0; p.hits = 0; p.diedAt = null;
    });
    S.players.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    S.phase = 'roles'; S.round = 0; S.log = []; S.winner = null;
    S.announce = { title: '역할이 정해졌어요', lines: ['역할 카드를 길게 눌러 확인하세요. 다른 친구에게 보여 주면 안 돼요.'] };
    this.addLog('게임 시작 · ' + ROLE_ORDER.filter((k) => S.counts[k]).map((k) => ROLE[k].name + ' ' + S.counts[k]).join(', '));
    this.changed();
  }

  /* ---------- 진행: 밤 ---------- */
  startNight() {
    const S = this.s;
    if (!(S.phase === 'roles' || S.phase === 'dayEnd')) return;
    S.round++;
    const qs = S.quizOn ? parseQuiz(S.quizText) : [];
    let quiz = null;
    if (qs.length) {
      const q = qs[(S.round - 1) % qs.length];
      const options = shuffle([q.answer, ...q.wrong]);
      quiz = { q: q.q, options, answer: options.indexOf(q.answer) };
    }
    S.night = { stage: 'pick', deadAtStart: S.players.filter((p) => !p.alive).map((p) => p.id), quiz, quizAns: {}, picks: {}, revote: null };
    S.day = null; S.timerEnd = null;
    S.phase = 'night';
    S.announce = { title: `${S.round}일째 밤이 되었습니다`, lines: ['모두 화면을 보고 미션을 해 주세요. 주변 친구 화면은 보지 않기!'] };
    this.changed();
  }
  mafiaTally(picks: Record<string, NightPick>, onlyIds?: string[]) {
    const cnt: Record<string, number> = {};
    for (const [pid, a] of Object.entries(picks)) {
      const p = this.P(pid);
      if (!p || !isMafia(p) || a.act !== 'kill') continue;
      if (onlyIds && !onlyIds.includes(a.target)) continue;
      cnt[a.target] = (cnt[a.target] || 0) + 1;
    }
    const max = Math.max(0, ...Object.values(cnt));
    const top = max ? Object.keys(cnt).filter((k) => cnt[k] === max) : [];
    return { cnt, top };
  }
  private startMafiaRevote(candidates: string[]) {
    const N = this.s.night!;
    N.stage = 'revote';
    N.revote = { candidates, picks: {} };
    this.addLog(`${this.s.round}일 밤 · 마피아 의견이 갈려 재지목 (${candidates.map(this.nameOf).join(', ')})`);
  }
  toMorning() {
    const S = this.s;
    if (S.phase !== 'night' || !S.night) return;
    const N = S.night;
    let target: string | null = null;
    let pickers: string[] = [];
    if (N.stage === 'pick') {
      const tl = this.mafiaTally(N.picks);
      if (tl.top.length > 1) { this.startMafiaRevote(tl.top); this.changed(); return; }
      target = tl.top[0] || null;
      if (target) pickers = Object.entries(N.picks).filter(([pid, a]) => isMafia(this.P(pid)) && a.act === 'kill' && a.target === target).map(([pid]) => pid);
    } else if (N.revote) {
      const tl = this.mafiaTally(N.revote.picks, N.revote.candidates);
      if (tl.top.length === 1) {
        target = tl.top[0];
        pickers = Object.entries(N.revote.picks).filter(([pid, a]) => isMafia(this.P(pid)) && a.target === target).map(([pid]) => pid);
      } else this.addLog(`${S.round}일 밤 · 재지목도 동점이거나 지목 없음 → 공격 없음`);
    }
    this.resolveNight(target, pickers);
  }
  private resolveNight(target: string | null, pickers: string[]) {
    const S = this.s, N = S.night!, r = S.round;
    const died: Player[] = [], revived: Player[] = [];
    const entries = Object.entries(N.picks);
    const healed = new Set(entries.filter(([, a]) => a.act === 'heal').map(([, a]) => a.target));
    if (target) {
      const tp = this.P(target);
      if (tp && tp.role) {
        if (healed.has(target)) this.addLog(`${r}일 밤 · 마피아가 ${tp.name} 공격 → 의사가 지켜 냄`);
        else if (tp.role === 'soldier' && !tp.used.soldier) { tp.used.soldier = true; this.addLog(`${r}일 밤 · 마피아가 ${tp.name} 공격 → 군인 방어(소진)`); }
        else {
          died.push(tp);
          let extra = '';
          if (tp.role === 'terrorist') {
            const ms = pickers.map((id) => this.P(id)).filter((m): m is Player => !!m && m.alive && isMafia(m));
            if (ms.length) { const m = pickOne(ms); died.push(m); extra = ` · 테러리스트 반격으로 마피아 ${m.name}도 탈락`; }
          }
          this.addLog(`${r}일 밤 · 마피아가 ${tp.name}(${ROLE[tp.role].name}) 탈락시킴${extra}`);
        }
      }
    } else if (N.stage === 'pick') this.addLog(`${r}일 밤 · 마피아 지목 없음`);
    died.forEach((d) => { d.alive = false; d.diedAt = r + '일 밤'; });

    // 성직자 부활
    for (const [pid, a] of entries) {
      if (a.act !== 'revive' || a.target === '__skip') continue;
      const pr = this.P(pid), t = this.P(a.target);
      if (!pr || pr.used.priest || !t || t.alive) continue;
      pr.used.priest = true; t.alive = true; t.diedAt = null; revived.push(t);
      this.addLog(`${r}일 밤 · 성직자 ${pr.name}이(가) ${t.name}(${t.role ? ROLE[t.role].name : ''}) 부활`);
    }
    // 경찰·영매 결과, 의심 지목
    const sus: Record<string, number> = {};
    for (const [pid, a] of entries) {
      const p = this.P(pid), t = this.P(a.target);
      if (!p || !t) continue;
      if (a.act === 'inspect') p.notes.push(`${r}일 밤 · ${t.name}님은 ${isMafia(t) ? '마피아입니다' : '마피아가 아닙니다'}.`);
      if (a.act === 'medium' && t.role) p.notes.push(`${r}일 밤 · ${t.name}님의 직업은 ${ROLE[t.role].name}입니다.`);
      if (a.act === 'suspect') { sus[t.id] = (sus[t.id] || 0) + 1; if (isMafia(t)) p.hits++; }
    }
    const lines: string[] = [];
    died.forEach((d) => lines.push(`${d.name}님이 탈락했습니다.`));
    revived.forEach((t) => lines.push(`${t.name}님이 부활했습니다.`));
    if (!died.length && !revived.length) lines.push('지난밤에는 아무 일도 없었습니다.');
    const top = Object.entries(sus).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) lines.push('가장 많이 의심받은 사람 · ' + top.map(([id, c]) => `${this.nameOf(id)} ${c}표`).join(', '));
    S.announce = { title: `${r}일째 아침이 밝았습니다`, lines };
    S.phase = 'day';
    S.day = { stage: 'vote', votes: {}, candidates: null, terrorist: null };
    S.timerEnd = null;
    const w = this.checkWin();
    if (w) { this.endGame(w, '아침 판정'); return; }
    this.changed();
  }

  /* ---------- 진행: 낮 ---------- */
  startVote() {
    const S = this.s;
    if (S.phase !== 'day' || !S.day) return;
    S.phase = 'vote'; S.day.stage = 'vote'; S.day.votes = {}; S.day.candidates = null;
    S.announce = { title: `${S.round}일째 처형 투표`, lines: ['처형할 사람 1명에게 투표하세요. 기권은 없어요.'] };
    this.changed();
  }
  closeVote() {
    const S = this.s;
    if (S.phase !== 'vote' || !S.day) return;
    const D = S.day;
    const cnt: Record<string, number> = {};
    for (const [pid, tid] of Object.entries(D.votes)) {
      const v = this.P(pid);
      if (!v || !v.alive) continue;
      cnt[tid] = (cnt[tid] || 0) + (v.role === 'politician' ? 2 : 1);
    }
    const tallyLine = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([id, c]) => `${this.nameOf(id)} ${c}표`).join(', ');
    const max = Math.max(0, ...Object.values(cnt));
    const top = max ? Object.keys(cnt).filter((k) => cnt[k] === max) : [];
    const lines: string[] = [];
    if (tallyLine) lines.push('득표 · ' + tallyLine);
    if (top.length > 1 && D.stage === 'vote') {
      D.stage = 'revote'; D.candidates = top; D.votes = {};
      S.announce = { title: '동점이에요 · 결선 투표', lines: [...lines, `${top.map(this.nameOf).join(', ')} 중에서 한 번 더 투표해 주세요.`] };
      this.addLog(`${S.round}일 낮 · 동점 → 결선 (${top.map(this.nameOf).join(', ')})`);
      this.changed();
      return;
    }
    if (top.length !== 1) {
      lines.push(top.length ? '결선도 동점이라 처형 없이 밤이 됩니다.' : '투표가 없어 처형 없이 밤이 됩니다.');
      this.addLog(`${S.round}일 낮 · 처형 없음 (${top.length ? '결선 동점' : '투표 없음'})`);
      S.announce = { title: '처형된 사람이 없습니다', lines };
      this.finishDay();
      return;
    }
    const t = this.P(top[0])!;
    if (t.role === 'politician') {
      lines.push('처형된 사람이 없습니다.');
      this.addLog(`${S.round}일 낮 · 최다 득표 ${t.name}(정치인) → 처형 면제`);
      S.announce = { title: '처형된 사람이 없습니다', lines };
      this.finishDay();
      return;
    }
    t.alive = false; t.diedAt = S.round + '일 낮';
    lines.push(`${t.name}님이 처형되었습니다.`);
    this.addLog(`${S.round}일 낮 · ${t.name}(${t.role ? ROLE[t.role].name : ''}) 처형`);
    S.announce = { title: `${t.name}님이 처형되었습니다`, lines };
    if (t.role === 'terrorist' && this.alive().length) {
      S.phase = 'terror'; D.terrorist = t.id;
      S.announce.lines.push(`${t.name}님이 함께 탈락할 사람을 고르고 있어요.`);
      this.changed();
      return;
    }
    this.finishDay();
  }
  skipTerror() {
    const S = this.s;
    if (S.phase !== 'terror') return;
    S.announce?.lines.push('테러리스트가 아무도 고르지 않았어요.');
    this.addLog(`${S.round}일 낮 · 테러리스트 지목 없이 진행`);
    this.finishDay();
  }
  private finishDay() {
    const S = this.s;
    S.phase = 'dayEnd'; S.timerEnd = null;
    const w = this.checkWin();
    if (w) { this.endGame(w, '낮 판정'); return; }
    if (S.round >= MAX_ROUND) {
      const m = this.alive().filter((p) => p.role && ROLE[p.role].team === 'mafia').length;
      const c = this.alive().filter((p) => p.role && ROLE[p.role].team === 'citizen').length;
      this.endGame(m >= c ? 'mafia' : 'citizen', `${MAX_ROUND}라운드 종료 · 남은 인원 비교`);
      return;
    }
    this.changed();
  }

  /* ---------- 승패 ---------- */
  checkWin(): TeamId | null {
    const al = this.alive();
    const m = al.filter((p) => p.role && ROLE[p.role].team === 'mafia').length;
    const c = al.filter((p) => p.role && ROLE[p.role].team === 'citizen').length;
    if (m === 0) return 'citizen';
    if (m >= c) return 'mafia';
    return null;
  }
  private endGame(base: TeamId, why: string) {
    const S = this.s;
    const rats = this.alive().filter((p) => p.role === 'rat').length;
    const w: TeamId = rats > 0 ? 'rat' : base;
    S.winner = w; S.phase = 'end'; S.timerEnd = null;
    S.endReason = (w === 'rat' ? `${TEAM_NAME[base]}의 승리 조건이 됐지만 쥐인간이 살아남았어요` : `${TEAM_NAME[w]} 승리 조건 달성`) + ` · ${why}`;
    S.announce = { title: `${TEAM_NAME[w]} 승리!`, lines: [S.endReason] };
    this.addLog(`게임 종료 · ${TEAM_NAME[w]} 승리 (${why})`);
    this.changed();
  }
  awards(): Awards {
    const best = (key: 'hits' | 'quizScore') => {
      const max = Math.max(0, ...this.s.players.map((p) => p[key]));
      return max ? { names: this.s.players.filter((p) => p[key] === max).map((p) => p.name), n: max } : null;
    };
    return { detective: best('hits'), quiz: best('quizScore') };
  }
  playAgain() {
    const S = this.s;
    S.players.forEach((p) => { p.role = null; p.alive = true; p.notes = []; p.used = { soldier: false, priest: false }; p.quizScore = 0; p.hits = 0; p.diedAt = null; });
    Object.assign(S, { phase: 'lobby', round: 0, announce: null, night: null, day: null, winner: null, endReason: '', log: [], timerEnd: null });
    this.changed();
  }

  /* ---------- 학생에게 보낼 화면 ---------- */
  viewFor(p: Player): StudentView {
    const S = this.s;
    const role = p.role ? ROLE[p.role] : null;
    const v: StudentView = {
      phase: S.phase, phaseLabel: PHASE_LABEL[S.phase], round: S.round, maxRound: MAX_ROUND, code: S.code, timerEnd: S.timerEnd,
      me: {
        name: p.name, alive: p.alive, diedAt: p.diedAt, role: p.role, roleName: role?.name ?? null, team: role?.team ?? null,
        teamName: role ? TEAM_NAME[role.team] : null, desc: role?.desc ?? null, notes: p.notes,
        teammates: isMafia(p) ? S.players.filter((x) => isMafia(x) && x.id !== p.id).map((x) => x.name) : [], used: p.used,
      },
      announce: S.announce, task: this.taskFor(p),
      lobby: S.phase === 'lobby' ? S.players.map((x) => x.name) : null,
      aliveList: S.phase !== 'lobby' ? S.players.map((x) => ({ name: x.name, alive: x.alive })) : null,
      end: null,
    };
    if (S.phase === 'end' && S.winner) {
      v.end = {
        winner: S.winner, winnerName: TEAM_NAME[S.winner], reason: S.endReason, awards: this.awards(),
        rows: S.players.map((x) => {
          const rd = x.role ? ROLE[x.role] : ROLE.citizen;
          return { name: x.name, role: rd.name, team: rd.team, alive: x.alive, win: rd.team === S.winner };
        }),
      };
    }
    return v;
  }

  /* ---------- 가상 학생 ---------- */
  private runBots() {
    for (const p of this.s.players) {
      if (!p.bot) continue;
      const t = this.taskFor(p);
      if (!t) { this.botPlan.delete(p.id); continue; }
      if (this.botPlan.get(p.id) === t.key) continue;
      this.botPlan.set(p.id, t.key);
      const delay = 500 + rand(this.fastBots ? 300 : 2200);
      const timer = setTimeout(() => {
        this.botTimers.delete(timer);
        if (this.disposed) return;
        const now = this.taskFor(this.P(p.id));
        if (!now || now.key !== t.key) { this.botPlan.delete(p.id); return; }
        let value: string;
        if (now.type === 'quiz' && this.s.night?.quiz) {
          value = Math.random() < 0.65 ? String(this.s.night.quiz.answer) : pickOne(now.options).id;
        } else if (now.act === 'revive' && Math.random() < 0.6) {
          value = '__skip';
        } else {
          const os = now.options.filter((o) => o.id !== '__skip');
          value = (os.length ? pickOne(os) : now.options[0]).id;
        }
        this.botPlan.delete(p.id);
        this.act(p.id, now.key, value);
      }, delay);
      this.botTimers.add(timer);
    }
  }
}
