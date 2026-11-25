/* =========================================================================
   HostSession — 교사 기기 한 탭의 게임 진행
   GameEngine(규칙) + RealtimeService(학생 연결) + RoomService(저장) 를 묶습니다.
   React 와 무관해서 테스트에서도 그대로 씁니다. (src/hooks/useHostSession.ts 가 감쌈)
   ========================================================================= */
import type { ClientMessage, GameState, HostTransport, RealtimeService, RoomService, TransportError } from '@/types';
import { SAVE_THROTTLE_MS, VIEW_THROTTLE_MS } from './constants';
import { GameEngine } from './engine';

export type HostStatus = 'connecting' | 'open' | TransportError;

export interface HostSessionDeps {
  realtime: RealtimeService;
  rooms: RoomService;
}

export class HostSession {
  readonly engine: GameEngine;
  status: HostStatus = 'connecting';
  /** 다른 기기가 이 방을 이어받아 이 탭은 멈춤 */
  moved = false;

  private transport: HostTransport | null = null;
  private cidToPid = new Map<string, string>();
  private pidToCid = new Map<string, string>();
  private sentViews = new Map<string, string>();
  private viewTimer: ReturnType<typeof setTimeout> | null = null;
  private lastViewAt = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private unsubEngine: () => void;
  private destroyed = false;

  constructor(state: GameState, private deps: HostSessionDeps) {
    state.players.forEach((p) => { if (!p.bot) p.connected = false; });
    this.engine = new GameEngine(state);
    this.unsubEngine = this.engine.subscribe(() => {
      this.queueSave();
      this.queueViews();
      this.emit();
    });
  }

  get state(): GameState {
    return this.engine.s;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  async start() {
    const t = await this.deps.realtime.createHost(this.engine.s.code, {
      open: () => {
        if (this.moved || this.destroyed) return;
        this.status = 'open';
        this.queueSave();
        this.emit();
      },
      error: (kind) => {
        if (this.destroyed) return;
        if (kind === 'moved') {
          this.moved = true;
          this.transport?.destroy();
        }
        this.status = kind;
        this.emit();
      },
      message: (cid, msg) => this.onMessage(cid, msg),
      close: (cid) => this.onClose(cid),
    });
    if (this.destroyed) { t.destroy(); return; }
    this.transport = t;
    this.engine.changed();
  }

  destroy() {
    this.destroyed = true;
    this.unsubEngine();
    this.engine.dispose();
    this.transport?.destroy();
    if (this.viewTimer) clearTimeout(this.viewTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.listeners.clear();
  }

  /** 대기실에서 학생 내보내기 */
  kick(pid: string) {
    const cid = this.pidToCid.get(pid);
    if (cid) {
      this.transport?.send(cid, { t: 'kicked' });
      this.pidToCid.delete(pid);
      this.cidToPid.delete(cid);
    }
    this.sentViews.delete(pid);
    this.engine.removePlayer(pid);
  }

  /* ---------- 학생 메시지 ---------- */
  private onMessage(cid: string, msg: ClientMessage) {
    if (this.moved || !msg || typeof msg !== 'object') return;
    const E = this.engine;
    if (msg.t === 'ping') {
      // 교사 화면을 새로 열었거나 다른 기기로 옮긴 뒤: 이미 참여한 학생을 다시 연결
      if (!this.cidToPid.has(cid) && typeof msg.token === 'string' && E.P(msg.token)) this.onMessage(cid, { t: 'join', name: '', token: msg.token });
      return;
    }
    if (msg.t === 'join') {
      const res = E.join(typeof msg.name === 'string' ? msg.name : '', typeof msg.token === 'string' ? msg.token : null);
      if (!res.ok) { this.transport?.send(cid, { t: 'error', text: res.error }); return; }
      const p = res.player;
      const old = this.pidToCid.get(p.id);
      if (old && old !== cid) this.cidToPid.delete(old);
      this.cidToPid.set(cid, p.id);
      this.pidToCid.set(p.id, cid);
      this.sentViews.delete(p.id);
      this.transport?.send(cid, { t: 'joined', token: p.id });
      return;
    }
    const pid = this.cidToPid.get(cid);
    if (!pid) return;
    if (msg.t === 'act' && typeof msg.key === 'string' && typeof msg.value === 'string') E.act(pid, msg.key, msg.value);
  }

  private onClose(cid: string) {
    const pid = this.cidToPid.get(cid);
    this.cidToPid.delete(cid);
    if (pid && this.pidToCid.get(pid) === cid) {
      this.pidToCid.delete(pid);
      this.engine.setConnected(pid, false);
    }
  }

  /* ---------- 학생 화면 전송: 묶어서, 바뀐 학생에게만 ---------- */
  private queueViews() {
    if (this.viewTimer || this.destroyed) return;
    this.viewTimer = setTimeout(() => this.flushViews(), Math.max(0, VIEW_THROTTLE_MS - (Date.now() - this.lastViewAt)));
  }
  private flushViews() {
    this.viewTimer = null;
    this.lastViewAt = Date.now();
    if (!this.transport || this.moved) return;
    for (const p of this.engine.s.players) {
      const cid = this.pidToCid.get(p.id);
      if (!cid) continue;
      const view = this.engine.viewFor(p);
      const j = JSON.stringify(view);
      if (this.sentViews.get(p.id) === j) continue;
      this.sentViews.set(p.id, j);
      this.transport.send(cid, { t: 'view', view });
    }
  }

  /* ---------- DB 저장(묶어서) ---------- */
  private queueSave() {
    if (this.saveTimer || this.moved || this.destroyed) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      if (this.moved || this.destroyed) return;
      const s = this.engine.s;
      this.deps.rooms.saveRoom({ code: s.code, state: JSON.parse(JSON.stringify(s)) as GameState }).catch(() => {
        /* 다음 변경 때 다시 저장됨 */
      });
    }, SAVE_THROTTLE_MS);
  }
}
