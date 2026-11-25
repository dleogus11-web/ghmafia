/* =========================================================================
   인증 — Supabase Auth 구현 (이메일 + 비밀번호)
   Google 로그인 등을 추가하려면 signInWithOAuth 를 AuthService 에 메서드로 추가하세요.
   ========================================================================= */
import type { Session } from '@supabase/supabase-js';
import type { AuthResult, AuthService, AuthSession, SignInRequest, SignUpRequest } from '@/types';
import { getSupabase } from './client';

const toSession = (s: Session | null): AuthSession | null =>
  s
    ? {
        user: {
          id: s.user.id,
          email: s.user.email ?? '',
          displayName: (s.user.user_metadata?.display_name as string | undefined) ?? s.user.email?.split('@')[0] ?? null,
        },
        accessToken: s.access_token,
      }
    : null;

const koMessage = (m: string): string => {
  if (/invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.';
  if (/email not confirmed/i.test(m)) return '이메일 인증을 먼저 완료해 주세요. 받은편지함을 확인해 주세요.';
  if (/already registered/i.test(m)) return '이미 가입된 이메일이에요. 로그인해 주세요.';
  if (/pwned|weak|leaked|known to be/i.test(m)) return '너무 흔하거나 유출된 적 있는 비밀번호예요. 다른 비밀번호를 써 주세요.';
  if (/at least|too short|characters/i.test(m)) return '비밀번호는 6자 이상이어야 해요.';
  return m;
};

export const supabaseAuthApi: AuthService = {
  async getSession() {
    const { data } = await getSupabase().auth.getSession();
    return toSession(data.session);
  },
  async signIn(req: SignInRequest): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email: req.email, password: req.password });
    if (error) return { ok: false, message: koMessage(error.message) };
    return { ok: true, session: toSession(data.session) };
  },
  async signUp(req: SignUpRequest): Promise<AuthResult> {
    const { data, error } = await getSupabase().auth.signUp({
      email: req.email,
      password: req.password,
      options: { data: { display_name: req.displayName ?? null }, emailRedirectTo: `${window.location.origin}/host` },
    });
    if (error) return { ok: false, message: koMessage(error.message) };
    return { ok: true, session: toSession(data.session), needsEmailConfirm: !data.session };
  },
  async signOut() {
    await getSupabase().auth.signOut();
  },
  onAuthStateChange(cb) {
    const { data } = getSupabase().auth.onAuthStateChange((_event, session) => cb(toSession(session)));
    return () => data.subscription.unsubscribe();
  },
};
