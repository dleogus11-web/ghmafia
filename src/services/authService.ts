/* =========================================================================
   인증 서비스 — AuthContext 만 이 파일을 import 합니다.
   ========================================================================= */
import type { AuthService } from '@/types';
import { isMock } from '@/lib/env';
import { mockAuthApi } from '@/mocks/mockAuthApi';

let impl: Promise<AuthService> | null = null;
const load = (): Promise<AuthService> =>
  (impl ??= isMock ? Promise.resolve(mockAuthApi) : import('./supabase/authApi').then((m) => m.supabaseAuthApi));

export const authService: AuthService = {
  getSession: () => load().then((s) => s.getSession()),
  signIn: (req) => load().then((s) => s.signIn(req)),
  signUp: (req) => load().then((s) => s.signUp(req)),
  signOut: () => load().then((s) => s.signOut()),
  onAuthStateChange(cb) {
    let off: (() => void) | null = null;
    let cancelled = false;
    void load().then((s) => {
      if (!cancelled) off = s.onAuthStateChange(cb);
    });
    return () => {
      cancelled = true;
      off?.();
    };
  },
};
