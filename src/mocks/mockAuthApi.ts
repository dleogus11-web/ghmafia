/* =========================================================================
   Mock 인증 — 아무 이메일·비밀번호(4자 이상)로 로그인됩니다. 브라우저에만 저장.
   실제 연동 시: src/services/supabase/authApi.ts (Supabase Auth)
   ========================================================================= */
import type { AuthResult, AuthService, AuthSession, SignInRequest, SignUpRequest } from '@/types';
import { localStore } from '@/lib/storage';
import { delay } from './delay';

const KEY = 'mock-auth-session';
const listeners = new Set<(s: AuthSession | null) => void>();

const makeSession = (email: string, displayName?: string | null): AuthSession => ({
  user: { id: 'mock-' + email.toLowerCase(), email: email.toLowerCase(), displayName: displayName || email.split('@')[0] },
  accessToken: null,
});

function validate(req: SignInRequest): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.email)) return '이메일 형식을 확인해 주세요.';
  if ((req.password || '').length < 4) return '비밀번호는 4자 이상이어야 해요. (목업 모드)';
  return null;
}

function setSession(s: AuthSession | null) {
  if (s) localStore.set(KEY, s);
  else localStore.del(KEY);
  listeners.forEach((f) => f(s));
}

export const mockAuthApi: AuthService = {
  async getSession() {
    await delay(40, 120);
    return localStore.get<AuthSession>(KEY);
  },
  async signIn(req: SignInRequest): Promise<AuthResult> {
    await delay();
    const err = validate(req);
    if (err) return { ok: false, message: err };
    const s = makeSession(req.email);
    setSession(s);
    return { ok: true, session: s };
  },
  async signUp(req: SignUpRequest): Promise<AuthResult> {
    await delay();
    const err = validate(req);
    if (err) return { ok: false, message: err };
    const s = makeSession(req.email, req.displayName);
    setSession(s);
    return { ok: true, session: s };
  },
  async signOut() {
    await delay(40, 120);
    setSession(null);
  },
  onAuthStateChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
};

/** mock DB 가 "현재 로그인한 교사" 를 알기 위해 씀 (Supabase 의 auth.uid() 역할) */
export const mockCurrentUserId = (): string | null => localStore.get<AuthSession>(KEY)?.user.id ?? null;
