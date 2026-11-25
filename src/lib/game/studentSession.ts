/* =========================================================================
   StudentSession — 학생 휴대폰의 연결·재연결·화면 상태
   React 와 무관 (src/hooks/useStudentSession.ts 가 감쌈)
   ========================================================================= */
import type { ClientTransport, HostMessage, RealtimeService, RoomService, StudentView } from '@/types';
import type { KeyValueStore } from '@/lib/storage';
import { ServiceError } from '@/lib/errors';
import { PING_MS } from './constants';

export type StudentStatus = 'connecting' | 'open' | 'lost' | 'noroom' | 'refused' | 'lib' | 'config';

export interface StudentSessionDeps {
  realtime: RealtimeService;
  rooms: RoomService;
  /** 재접속 토큰 저장소 */
  tokenStore: KeyValueStore;
}

export class StudentSession {
  status: StudentStatus = 'connecting';
  view: StudentView | null = null;
  err = '';

  private token: string | null;
  private net: ClientTransport | null = null;
  private listeners = new Set<() => void>();
  private retry: ReturnType<typeof setTimeout> | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private lastViewJson = '';
  private destroyed = false;
  private gen = 0;

  constructor(readonly code: string, readonly name: string, private deps: StudentSessionDeps) {
    this.token = deps.tokenStore.get<string>(this.tokenKey);
  }

  private get tokenKey() {
    return 'mafia-token-' + this.code;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }
  private set(status: StudentStatus) {
    this.status = status;
    this.emit();
  }

  start() {
    void this.connect();
    // 살아 있다는 신호. 아직 답을 못 받았으면 참여 요청을 다시 보냄(선생님 화면이 늦게 켜진 경우)
    this.ping = setInterval(() => {
      if (!this.net || this.status !== 'open') return;
      if (!this.view) this.sendJoin();
      else this.net.send({ t: 'ping', token: this.token });
    }, PING_MS);
  }

  destroy() {
    this.destroyed = true;
    this.gen++;
    if (this.retry) clearTimeout(this.retry);
    if (this.ping) clearInterval(this.ping);
    this.net?.destroy();
    this.listeners.clear();
  }

  /** 할 일 제출 */
  submit(key: string, value: string) {
    this.net?.send({ t: 'act', key, value });
  }

  private sendJoin() {
    this.net?.send({ t: 'join', name: this.name, token: this.token });
  }

  private scheduleReconnect(ms: number) {
    if (this.destroyed) return;
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(() => void this.connect(), ms);
  }

  private async connect() {
    if (this.destroyed) return;
    const my = ++this.gen;
    this.net?.destroy();
    this.net = null;
    if (!this.view) this.set('connecting');

    let exists: boolean;
    try {
      exists = await this.deps.rooms.roomExists(this.code);
    } catch (e) {
      if (my !== this.gen) return;
      if (e instanceof ServiceError && e.code === 'config') { this.set('config'); return; }
      this.set('lost');
      this.scheduleReconnect(3000);
      return;
    }
    if (my !== this.gen) return;
    if (!exists) { this.set('noroom'); this.scheduleReconnect(3000); return; }

    const net = await this.deps.realtime.createClient(this.code, {
      open: () => {
        if (my !== this.gen) return;
        this.set('open');
        this.sendJoin();
      },
      message: (m) => { if (my === this.gen) this.onMessage(m); },
      close: () => {
        if (my !== this.gen || this.status === 'refused') return;
        this.set('lost');
        this.scheduleReconnect(2500);
      },
      error: (kind) => {
        if (my !== this.gen || this.status === 'refused') return;
        if (kind === 'lib' || kind === 'config') { this.set(kind); return; }
        this.set('lost');
        this.scheduleReconnect(3000);
      },
    });
    if (my !== this.gen) { net.destroy(); return; }
    this.net = net;
  }

  private onMessage(msg: HostMessage) {
    if (msg.t === 'joined') {
      this.token = msg.token;
      this.deps.tokenStore.set(this.tokenKey, msg.token);
      this.err = '';
    } else if (msg.t === 'view') {
      const j = JSON.stringify(msg.view);
      if (j === this.lastViewJson && !this.err) return;
      this.lastViewJson = j;
      this.view = msg.view;
      this.err = '';
    } else if (msg.t === 'error') {
      this.err = msg.text;
      this.status = 'refused';
    } else if (msg.t === 'kicked') {
      this.err = '선생님이 대기실에서 내보냈어요.';
      this.status = 'refused';
      this.token = null;
      this.deps.tokenStore.del(this.tokenKey);
      this.view = null;
    }
    this.emit();
  }
}
