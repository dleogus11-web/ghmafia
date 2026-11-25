/* =========================================================================
   AuthContext — 교사 로그인 상태
   내부는 authService(mock 또는 Supabase Auth)만 호출합니다.
   ========================================================================= */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResult, AuthSession, AuthUser, SignInRequest, SignUpRequest } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login(req: SignInRequest): Promise<AuthResult>;
  signup(req: SignUpRequest): Promise<AuthResult>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const off = authService.onAuthStateChange((s) => {
      if (alive) setSession(s);
    });
    authService
      .getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const login = useCallback(async (req: SignInRequest) => {
    const r = await authService.signIn(req);
    if (r.ok && r.session) setSession(r.session);
    return r;
  }, []);

  const signup = useCallback(async (req: SignUpRequest) => {
    const r = await authService.signUp(req);
    if (r.ok && r.session) setSession(r.session);
    return r;
  }, []);

  const logout = useCallback(async () => {
    await authService.signOut();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user: session?.user ?? null, session, isAuthenticated: !!session, isLoading, login, signup, logout }),
    [session, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 는 <AuthProvider> 안에서만 쓸 수 있어요.');
  return ctx;
}
