/* =========================================================================
   환경 변수
   · Lovable Cloud 를 켜면 VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY 가 자동으로 들어오고,
     그때부터 자동으로 Supabase 구현(src/services/supabase)을 씁니다.
   · 키가 없으면 mock 구현(src/mocks: 같은 브라우저 탭끼리 연결)을 씁니다.
   · 강제로 고르려면 VITE_BACKEND=mock 또는 VITE_BACKEND=supabase
   ========================================================================= */

const env: Record<string, string | undefined> =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env) ?? {};

export const SUPABASE_URL = env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY ?? '';

export const BACKEND: 'mock' | 'supabase' =
  env.VITE_BACKEND === 'mock' ? 'mock'
  : env.VITE_BACKEND === 'supabase' ? 'supabase'
  : SUPABASE_URL && SUPABASE_KEY ? 'supabase'
  : 'mock';

export const isMock = BACKEND === 'mock';
