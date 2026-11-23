import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ServerEnv } from './env';

/** Cliente com a service role key. Uso exclusivo do servidor; ignora RLS. */
export function createAdminClient(
  env: Pick<ServerEnv, 'SUPABASE_URL' | 'SUPABASE_SERVICE_ROLE_KEY'>,
): SupabaseClient {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
