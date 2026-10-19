import "server-only";
import { buildEventPayload } from "@/lib/notifications";
import type { PreviewMode } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser } from "./push";

/**
 * Sends a push about a shared event (a gift, an answer, a reminder) to one person, respecting their
 * notification settings and privacy mode. Best effort: a failure never breaks the action that triggered it.
 */
export async function pushEvent(input: {
  fromUserId: string;
  toUserId: string;
  tag: string;
  url: string;
  fullBody: (senderName: string) => string;
  genericBody: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const admin = createAdminClient();
  if (!admin) return "skipped";
  try {
    const [{ data: prefs }, { data: sender }, { data: nick }] = await Promise.all([
      admin.from("user_preferences").select("notifications_enabled, notification_preview_mode").eq("user_id", input.toUserId).maybeSingle(),
      admin.from("profiles").select("display_name").eq("id", input.fromUserId).maybeSingle(),
      admin.from("couple_members").select("partner_nickname").eq("user_id", input.toUserId).maybeSingle(),
    ]);
    const p = prefs as { notifications_enabled: boolean; notification_preview_mode: PreviewMode } | null;
    if (p && !p.notifications_enabled) return "skipped";
    const name =
      (nick as { partner_nickname: string | null } | null)?.partner_nickname ||
      (sender as { display_name: string } | null)?.display_name ||
      "";
    const payload = buildEventPayload({
      tag: input.tag,
      url: input.url,
      previewMode: p?.notification_preview_mode ?? "full",
      fullTitle: name,
      fullBody: input.fullBody(name),
      genericBody: input.genericBody,
    });
    const outcome = await sendPushToUser(admin, input.toUserId, payload);
    return outcome.status === "sent" ? "sent" : outcome.status === "failed" ? "failed" : "skipped";
  } catch {
    return "failed";
  }
}
