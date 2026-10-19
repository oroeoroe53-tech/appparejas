import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/**
 * Service-role client. BYPASSES RLS. Server only, and only for the few operations that
 * need it: reading push subscriptions / recipient preferences, and deleting accounts.
 * Never pass user-supplied ids here without checking them against the authenticated user first.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv.supabaseUrl || !key) return null;
  return createClient(publicEnv.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
