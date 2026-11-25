/* Lovable Cloud 클라이언트 — 자동 생성된 클라이언트를 그대로 사용합니다. */
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export function getSupabase(): SupabaseClient {
  return supabase as unknown as SupabaseClient;
}
