/* =========================================================================
   실시간 연결 — Supabase Realtime Broadcast 구현
   · 학생 → 교사: 방 채널(kr-classmafia-<코드>)로 REST 전송. 학생은 이 채널을 "구독하지 않음"
     → 다른 학생의 메시지를 받지 않고, 프로젝트 메시지 사용량도 줄어듦
   · 교사 → 학생: 학생마다 비밀 우편함 채널(kr-classmafia-<코드>-<우편함>)
     → 역할 정보가 그 학생에게만 감
   · 교사 탭끼리: 방 채널의 'host' 이벤트로 "이어받기" 알림
   (2026-11 Vercel 판에서 실제 운영하던 방식을 그대로 옮김)
   ========================================================================= */
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  ClientMessage, ClientTransport, ClientTransportHandlers, HostMessage, HostTransport, HostTransportHandlers, RealtimeService,
} from '@/types';
import { secret } from '@/lib/random';
import { ServiceError } from '@/lib/errors';
import { CHANNEL_PREFIX, LOST_MS } from '@/lib/game/constants';
import { getSupabase } from './client';

const CID_RE = /^[a-z0-9]{12,40}$/;
const topic = (code: string) => CHANNEL_PREFIX + code;
type Packet = { from: string; msg: ClientMessage };

function clientOrError(onError: (k: 'config' | 'lib') => void) {
  try {
    return getSupabase();
  } catch (e) {
    setTimeout(() => onError(e instanceof ServiceError && e.code === 'config' ? 'config' : 'lib'), 0);
    return null;
  }
}

/** 구독하지 않은 채널로 보내기(REST). httpSend 가 있는 최신 버전은 그것을 사용 */
function restSend(ch: RealtimeChannel, payload: Packet) {
  const anyCh = ch as RealtimeChannel & { httpSend?: (event: string, payload: unknown) => Promise<unknown> };
  try {
    if (typeof anyCh.httpSend === 'function') {
      void anyCh.httpSend('msg', payload).catch(() => ch.send({ type: 'broadcast', event: 'msg', payload }));
    } else {
      void ch.send({ type: 'broadcast', event: 'msg', payload });
    }
  } catch {
    /* 다음 ping 때 다시 시도 */
  }
}

export const supabaseRealtime: RealtimeService = {
  async createHost(code: string, h: HostTransportHandlers): Promise<HostTransport> {
    const sb = clientOrError(h.error);
    if (!sb) return { send() {}, destroy() {} };
    const me = secret(12);
    type Box = { ch: RealtimeChannel; ready: boolean; q: HostMessage[]; seen: number };
    const boxes = new Map<string, Box>();
    let dead = false;

    const box = (cid: string): Box => {
      let e = boxes.get(cid);
      if (e) return e;
      const b: Box = { ch: sb.channel(topic(code) + '-' + cid), ready: false, q: [], seen: Date.now() };
      b.ch.subscribe((st) => {
        if (st === 'SUBSCRIBED') {
          b.ready = true;
          b.q.splice(0).forEach((m) => void b.ch.send({ type: 'broadcast', event: 'msg', payload: m }));
        } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') b.ready = false;
      });
      boxes.set(cid, b);
      e = b;
      return e;
    };
    const drop = (cid: string) => {
      const e = boxes.get(cid);
      if (!e) return;
      boxes.delete(cid);
      void sb.removeChannel(e.ch);
      h.close(cid);
    };

    const room = sb.channel(topic(code));
    room.on('broadcast', { event: 'msg' }, ({ payload }) => {
      const p = payload as Packet | undefined;
      if (dead || !p || typeof p.from !== 'string' || !CID_RE.test(p.from)) return;
      box(p.from).seen = Date.now();
      if (p.msg && p.msg.t === 'bye') { drop(p.from); return; }
      h.message(p.from, p.msg);
    });
    room.on('broadcast', { event: 'host' }, ({ payload }) => {
      const p = payload as { t?: string; id?: string } | undefined;
      if (!dead && p && p.t === 'takeover' && p.id !== me) h.error('moved');
    });
    room.subscribe((st) => {
      if (dead) return;
      if (st === 'SUBSCRIBED') {
        void room.send({ type: 'broadcast', event: 'host', payload: { t: 'takeover', id: me } });
        h.open();
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') h.error('network');
    });
    const sweep = setInterval(() => {
      const now = Date.now();
      for (const [cid, e] of boxes) if (now - e.seen > LOST_MS) drop(cid);
    }, 5000);

    return {
      send(cid, msg) {
        if (dead) return;
        const e = box(cid);
        if (e.ready) void e.ch.send({ type: 'broadcast', event: 'msg', payload: msg });
        else { e.q.push(msg); if (e.q.length > 8) e.q.splice(0, e.q.length - 8); }
      },
      destroy() {
        if (dead) return;
        dead = true;
        clearInterval(sweep);
        void sb.removeChannel(room);
        boxes.forEach((b) => void sb.removeChannel(b.ch));
        boxes.clear();
      },
    };
  },

  async createClient(code: string, h: ClientTransportHandlers): Promise<ClientTransport> {
    const sb = clientOrError(h.error);
    if (!sb) return { send() {}, destroy() {} };
    const me = secret(20); // 비밀 우편함 이름 — 교사만 알게 됨
    let dead = false;
    const room = sb.channel(topic(code)); // 구독하지 않고 보내기만
    const inbox = sb.channel(topic(code) + '-' + me);
    const stop = () => {
      if (dead) return;
      dead = true;
      void sb.removeChannel(inbox);
      void sb.removeChannel(room);
    };
    inbox.on('broadcast', { event: 'msg' }, ({ payload }) => {
      if (!dead && payload) h.message(payload as HostMessage);
    });
    inbox.subscribe((st) => {
      if (dead) return;
      if (st === 'SUBSCRIBED') h.open();
      else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') { stop(); h.close(); }
    });
    return {
      send(msg) { if (!dead) restSend(room, { from: me, msg }); },
      destroy: stop,
    };
  },
};
