/* =========================================================================
   실시간 메시지 타입
   교사 기기(호스트)가 규칙을 계산하고, 실시간 서비스는 메시지만 전달합니다.
   ========================================================================= */
import type { StudentView } from './game';

/** 학생 → 교사 */
export type ClientMessage =
  | { t: 'join'; name: string; token: string | null }
  | { t: 'act'; key: string; value: string }
  | { t: 'ping'; token: string | null }
  | { t: 'bye' };

/** 교사 → 학생 */
export type HostMessage =
  | { t: 'joined'; token: string }
  | { t: 'view'; view: StudentView }
  | { t: 'error'; text: string }
  | { t: 'kicked' };

export type TransportError =
  | 'lib'      // 라이브러리 로드 실패
  | 'config'   // 환경 변수 없음
  | 'network'  // 연결 끊김(자동 재시도 중)
  | 'moved';   // 다른 기기가 같은 방을 이어받음(교사 전용)

export interface HostTransportHandlers {
  open(): void;
  error(kind: TransportError): void;
  /** cid = 학생 연결(우편함) id */
  message(cid: string, msg: ClientMessage): void;
  close(cid: string): void;
}

export interface HostTransport {
  send(cid: string, msg: HostMessage): void;
  destroy(): void;
}

export interface ClientTransportHandlers {
  open(): void;
  message(msg: HostMessage): void;
  close(): void;
  error(kind: TransportError): void;
}

export interface ClientTransport {
  send(msg: ClientMessage): void;
  destroy(): void;
}

export interface RealtimeService {
  createHost(code: string, h: HostTransportHandlers): Promise<HostTransport>;
  createClient(code: string, h: ClientTransportHandlers): Promise<ClientTransport>;
}
