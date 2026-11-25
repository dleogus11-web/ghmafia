/* =========================================================================
   인증 타입 — 교사만 로그인합니다. 학생은 로그인 없이 방 코드 + 이름으로 참여.
   ========================================================================= */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string | null;
}

/* ---------- Request DTO ---------- */

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest extends SignInRequest {
  displayName?: string;
}

/* ---------- Response DTO ---------- */

export type AuthResult =
  | { ok: true; session: AuthSession | null; needsEmailConfirm?: boolean }
  | { ok: false; message: string };

/* ---------- Service 인터페이스 ---------- */

export interface AuthService {
  getSession(): Promise<AuthSession | null>;
  signIn(req: SignInRequest): Promise<AuthResult>;
  signUp(req: SignUpRequest): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** 로그인 상태가 바뀔 때 호출. 구독 해제 함수를 돌려줌 */
  onAuthStateChange(cb: (session: AuthSession | null) => void): () => void;
}
