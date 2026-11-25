/* =========================================================================
   Mock 실시간 — BroadcastChannel(같은 브라우저의 탭끼리)
   교사 탭 1개 + 학생 탭 여러 개로 서버 없이 시험할 수 있어요.
   실제 연동 시: src/services/supabase/realtime.ts (Supabase Realtime Broadcast)
   ========================================================================= */
import type {
  ClientMessage, ClientTransport, ClientTransportHandlers, HostMessage, HostTransport, HostTransportHandlers, RealtimeService,
} from '@/types';
import { secret } from '@/lib/random';
import { CHANNEL_PREFIX, LOST_MS } from '@/lib/game/constants';

type Packet =
  | { kind: 'toHost'; from: string; msg: ClientMessage }
  | { kind: 'toClient'; to: string; msg: HostMessage }
  | { kind: 'takeover'; id: string };

const latency = () => 20 + Math.floor(Math.random() * 80);
const later = (fn: () => void) => setTimeout(fn, latency());

function hasBroadcastChannel() {
  return typeof (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel === 'function';
}

export const mockRealtime: RealtimeService = {
  async createHost(code: string, h: HostTransportHandlers): Promise<HostTransport> {
    if (!hasBroadcastChannel()) {
      setTimeout(() => h.error('lib'), 0);
      return { send() {}, destroy() {} };
    }
    const me = secret(12);
    const bc = new BroadcastChannel(CHANNEL_PREFIX + code);
    const seen = new Map<string, number>();
    let dead = false;
    bc.onmessage = (e: MessageEvent<Packet>) => {
      if (dead) return;
      const d = e.data;
      if (d.kind === 'takeover' && d.id !== me) { h.error('moved'); return; }
      if (d.kind !== 'toHost') return;
      if (d.msg.t === 'bye') { seen.delete(d.from); h.close(d.from); return; }
      seen.set(d.from, Date.now());
      later(() => !dead && h.message(d.from, d.msg));
    };
    const sweep = setInterval(() => {
      const now = Date.now();
      for (const [cid, t] of seen) if (now - t > LOST_MS) { seen.delete(cid); h.close(cid); }
    }, 5000);
    later(() => {
      if (dead) return;
      bc.postMessage({ kind: 'takeover', id: me } satisfies Packet);
      h.open();
    });
    return {
      send(cid, msg) { if (!dead) later(() => !dead && bc.postMessage({ kind: 'toClient', to: cid, msg } satisfies Packet)); },
      destroy() { dead = true; clearInterval(sweep); bc.close(); },
    };
  },

  async createClient(code: string, h: ClientTransportHandlers): Promise<ClientTransport> {
    if (!hasBroadcastChannel()) {
      setTimeout(() => h.error('lib'), 0);
      return { send() {}, destroy() {} };
    }
    const me = secret(20);
    const bc = new BroadcastChannel(CHANNEL_PREFIX + code);
    let dead = false;
    bc.onmessage = (e: MessageEvent<Packet>) => {
      const d = e.data;
      if (!dead && d.kind === 'toClient' && d.to === me) h.message(d.msg);
    };
    const bye = () => bc.postMessage({ kind: 'toHost', from: me, msg: { t: 'bye' } } satisfies Packet);
    if (typeof window !== 'undefined') window.addEventListener('beforeunload', bye);
    later(() => !dead && h.open());
    return {
      send(msg) { if (!dead) bc.postMessage({ kind: 'toHost', from: me, msg } satisfies Packet); },
      destroy() {
        if (dead) return;
        dead = true;
        if (typeof window !== 'undefined') window.removeEventListener('beforeunload', bye);
        bc.close();
      },
    };
  },
};
