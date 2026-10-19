"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { t } from "@/content";
import { publicEnv } from "@/lib/env";
import { dbErrorCode } from "@/lib/errors";
import { formatInviteCode, parseInviteToken } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/server/queries";
import { purgeSpaceMedia } from "@/server/media";

export type InviteResult =
  | { ok: true; url: string; code: string; expiresAt: string }
  | { ok: false; error: string };

export async function createInvitationAction(): Promise<InviteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invitation");
  const row = (data as Array<{ token: string; expires_at: string }> | null)?.[0];
  if (error || !row) {
    const code = dbErrorCode(error);
    if (code === "rate_limited") return { ok: false, error: t.write.errors.rateLimited };
    if (code === "space_full") return { ok: false, error: t.connect.alreadyInSpace };
    return { ok: false, error: t.settings.errors.generic };
  }
  revalidatePath("/connect");
  return { ok: true, url: `${publicEnv.siteUrl}/join/${row.token}`, code: formatInviteCode(row.token), expiresAt: row.expires_at };
}

export async function revokeInvitationAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitations");
  revalidatePath("/connect");
  return { ok: !error };
}

/** Normalises a pasted link/code and sends the user to the join page. */
export async function goToJoinAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const token = parseInviteToken(String(formData.get("code") ?? ""));
  if (!token) return { error: t.connect.invalidCode };
  redirect(`/join/${token}`);
}

export async function acceptInvitationAction(token: string): Promise<{ error: string } | never> {
  const clean = parseInviteToken(token);
  if (!clean) return { error: t.connect.invalidInvite };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: clean });
  if (error) {
    const code = dbErrorCode(error);
    if (code === "own_invitation") return { error: t.connect.ownInvite };
    if (code === "already_in_space") return { error: t.connect.alreadyInSpace };
    if (code === "rate_limited") return { error: t.write.errors.rateLimited };
    return { error: t.settings.errors.generic };
  }
  if (!data) return { error: t.connect.invalidInvite };
  revalidatePath("/", "layout");
  redirect("/home");
}

export async function leaveSpaceAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  if (String(formData.get("confirm") ?? "").trim() !== t.settings.relationship.leaveWord) {
    return { error: t.settings.errors.wrongWord };
  }
  const ctx = await getAppContext();
  if (!ctx?.space) return { error: t.settings.errors.generic };
  // Whoever stays keeps the shared letters and files. Only when nobody stays must every file go.
  const lastOne = ctx.space.status !== "active";
  const spaceId = ctx.space.id;
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_space");
  if (error) return { error: t.settings.errors.generic };
  if (lastOne) await purgeSpaceMedia(spaceId).catch(() => undefined);
  revalidatePath("/", "layout");
  redirect("/connect");
}
