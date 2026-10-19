"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { t } from "@/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation";
import { getAppContext } from "@/server/queries";
import { purgeSpaceMedia, purgeUserMedia } from "@/server/media";
import type { FormState } from "./types";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    partnerNickname: formData.get("partnerNickname") ?? undefined,
    avatarUrl: formData.get("avatarUrl") ?? undefined,
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "avatarUrl") return { error: t.settings.profile.avatarInvalid };
    return { error: t.auth.errors.nameRequired };
  }
  const ctx = await getAppContext();
  if (!ctx) return { error: t.settings.errors.generic };
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName, avatar_url: parsed.data.avatarUrl })
    .eq("id", ctx.user.id);
  if (error) return { error: t.settings.errors.generic };

  if (ctx.space) {
    const { error: nickError } = await supabase
      .from("couple_members")
      .update({ partner_nickname: parsed.data.partnerNickname })
      .eq("user_id", ctx.user.id);
    if (nickError) return { error: t.settings.errors.generic };
  }
  revalidatePath("/", "layout");
  return { notice: t.settings.profile.saved };
}

const prefsSchema = z.object({
  notifications_enabled: z.boolean().optional(),
  notification_preview_mode: z.enum(["generic", "full"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
});

export async function updatePreferencesAction(input: z.input<typeof prefsSchema>): Promise<{ ok: boolean }> {
  const parsed = prefsSchema.safeParse(input);
  const ctx = await getAppContext();
  if (!parsed.success || !ctx) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase
    .from("user_preferences")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id);
  if (error) return { ok: false };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAccountAction(_prev: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  if (String(formData.get("confirm") ?? "").trim() !== t.settings.account.deleteWord) {
    return { error: t.settings.errors.wrongWord };
  }
  const ctx = await getAppContext();
  const admin = createAdminClient();
  if (!ctx || !admin) return { error: t.settings.errors.generic };
  // Storage files are not covered by database cascades, so remove them first.
  const spaceId = ctx.space?.id;
  const lastOne = !ctx.space || ctx.space.status !== "active";
  await purgeUserMedia(ctx.user.id).catch(() => undefined);
  if (spaceId && lastOne) await purgeSpaceMedia(spaceId).catch(() => undefined);
  // The user id comes from the verified session, never from the request.
  const { error } = await admin.auth.admin.deleteUser(ctx.user.id);
  if (error) return { error: t.settings.errors.generic };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
