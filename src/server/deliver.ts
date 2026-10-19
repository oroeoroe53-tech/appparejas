import "server-only";
import { MEDIA_BUCKET } from "@/lib/media";
import { buildMessagePayload } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message, PreviewMode, PushStatus } from "@/lib/types";
import { sendPushToUser } from "./push";

/**
 * Notifies the recipient of a message (respecting their settings) and records the outcome.
 * "sent" means the push service accepted it, never that the phone displayed it.
 */
export async function notifyRecipient(message: Message): Promise<"sent" | "skipped" | "failed"> {
  const admin = createAdminClient();
  const setStatus = async (status: PushStatus) => {
    await admin?.from("messages").update({ push_status: status }).eq("id", message.id);
  };
  if (!admin) {
    return "skipped";
  }
  try {
    const [{ data: prefs }, { data: sender }, { data: nick }] = await Promise.all([
      admin.from("user_preferences").select("notifications_enabled, notification_preview_mode").eq("user_id", message.recipient_id).maybeSingle(),
      admin.from("profiles").select("display_name").eq("id", message.sender_id).maybeSingle(),
      // What the RECIPIENT calls the sender, so the lock screen reads like their own contact name.
      admin.from("couple_members").select("partner_nickname").eq("user_id", message.recipient_id).maybeSingle(),
    ]);
    const enabled = (prefs as { notifications_enabled: boolean } | null)?.notifications_enabled ?? true;
    if (!enabled) {
      await setStatus("skipped");
      return "skipped";
    }
    const previewMode = ((prefs as { notification_preview_mode: PreviewMode } | null)?.notification_preview_mode ?? "generic") as PreviewMode;
    // A drawing travels as the notification picture (full mode only). The link is signed and expires in 24 hours.
    let imageUrl: string | undefined;
    if (message.message_type === "drawing" && message.attachment_path && previewMode === "full") {
      const { data: signed } = await admin.storage.from(MEDIA_BUCKET).createSignedUrl(message.attachment_path, 60 * 60 * 24);
      imageUrl = signed?.signedUrl;
    }
    const payload = buildMessagePayload({
      messageId: message.id,
      type: message.message_type,
      senderName: (nick as { partner_nickname: string | null } | null)?.partner_nickname || (sender as { display_name: string } | null)?.display_name || "",
      content: message.content,
      previewMode,
      imageUrl,
    });
    const outcome = await sendPushToUser(admin, message.recipient_id, payload);
    if (outcome.status === "sent") {
      await setStatus("sent");
      return "sent";
    }
    if (outcome.status === "failed") {
      await setStatus("failed");
      return "failed";
    }
    await setStatus("skipped");
    return "skipped";
  } catch {
    // The message itself is already stored; a notification problem must not turn the send into an error.
    await setStatus("failed").catch(() => undefined);
    return "failed";
  }
}

