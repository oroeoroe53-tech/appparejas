import type { SupabaseClient } from "@supabase/supabase-js";

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * Who is signed in, without a trip to the auth server when it can be avoided.
 *
 * `getClaims()` verifies the access token's signature locally against the project's cached public keys,
 * so it costs no network round trip (a token is valid for an hour, and it is refreshed automatically).
 * If the project still uses a shared-secret token, supabase-js asks the auth server itself, so this is
 * never less safe than `getUser()` for reading identity. Operations that must reflect revocation
 * immediately (deleting an account) rely on database rules and the service key, not on this alone.
 */
export async function currentUser(supabase: SupabaseClient): Promise<SessionUser | null> {
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (typeof sub === "string" && sub) {
    const email = data?.claims?.email;
    return { id: sub, email: typeof email === "string" ? email : "" };
  }
  return null;
}
