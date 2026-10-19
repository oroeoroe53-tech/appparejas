"use server";

import { revalidatePath } from "next/cache";
import { MESSAGE_LIMITS } from "@/lib/message-types";
import { dbErrorCode, sendErrorMessage } from "@/lib/errors";
import { buildMessagePayload } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reactionSchema, sendMessageSchema, uuidSchema } from "@/lib/validation";
import { songInputSchema, type SongInput } from "@/lib/songs";
import { sendPushToUser } from "@/server/push";
import { lookupSong } from "@/server/songs";
import type { Message, PreviewMode, PushStatus } from "@/lib/types";

export type SendResult =
  | { ok: true; messageId: string; push: "sent" | "skipped" | "failed" | "already_sent" }
  | { ok: false; error: string };

export async function sendMessageAction(input: { content: string; type: string; clientId: string; song?: SongInput | null }): Promise<SendResult> {
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    if (issue?.message === "tooLong" && typeof input.type === "string" && input.type in MESSAGE_LIMITS) {
      return { ok: false, error: sendErrorMessage("tooLong", MESSAGE_LIMITS[input.type as keyof typeof MESSAGE_LIMITS]) };
    }
    return { ok: false, error: sendErrorMessage("empty") };
  }

  // A song is never taken from the browser as-is: we re-fetch the track from Apple and keep only its canonical data.
  let pSong: Record<string, unknown> | null = null;
  if (input.song) {
    const clip = songInputSchema.safeParse(input.song);
    const track = clip.success ? await lookupSong(clip.data.trackId) : null;
    if (!clip.success || !track) return { ok: false, error: sendErrorMessage("invalid_song") };
    pSong = {
      track_id: track.trackId,
      title: track.title,
      artist: track.artist,
      preview_url: track.previewUrl,
      artwork_url: track.artworkUrl,
      start: clip.data.start,
      duration: clip.data.duration,
    };
  }

  const supabase = await createClient();
  // The database derives sender and recipient from the session and enforces limits and idempotency.
  const { data, error } = await supabase.rpc("send_message", {
    p_content: parsed.data.content,
    p_type: parsed.data.type,
    p_client_id: parsed.data.clientId,
    p_song: pSong,
  });
  if (error || !data) return { ok: false, error: sendErrorMessage(dbErrorCode(error)) };

  const { message, is_new } = data as { message: Message; is_new: boolean };
  // A retry of an already-stored draft must never notify twice.
  if (!is_new) return { ok: true, messageId: message.id, push: "already_sent" };

  const push = await notifyRecipient(message);
  revalidatePath("/letters");
  revalidatePath("/home");
  return { ok: true, messageId: message.id, push };
}

async function notifyRecipient(message: Message): Promise<"sent" | "skipped" | "failed"> {
  const admin = createAdminClient();
  const setStatus = async (status: PushStatus) => {
    await admin?.from("messages").update({ push_status: status }).eq("id", message.id);
  };
  if (!admin) {
    return "skipped";
  }
  try {
    const [{ data: prefs }, { data: sender }] = await Promise.all([
      admin.from("user_preferences").select("notifications_enabled, notification_preview_mode").eq("user_id", message.recipient_id).maybeSingle(),
      admin.from("profiles").select("display_name").eq("id", message.sender_id).maybeSingle(),
    ]);
    const enabled = (prefs as { notifications_enabled: boolean } | null)?.notifications_enabled ?? true;
    if (!enabled) {
      await setStatus("skipped");
      return "skipped";
    }
    const previewMode = ((prefs as { notification_preview_mode: PreviewMode } | null)?.notification_preview_mode ?? "generic") as PreviewMode;
    const payload = buildMessagePayload({
      messageId: message.id,
      type: message.message_type,
      senderName: (sender as { display_name: string } | null)?.display_name ?? "",
      content: message.content,
      previewMode,
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

export async function markReadAction(id: string): Promise<{ ok: boolean }> {
  if (!uuidSchema.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_message_read", { p_id: id });
  if (error) return { ok: false };
  revalidatePath("/home");
  revalidatePath("/letters");
  return { ok: true };
}

export async function reactAction(id: string, reaction: string | null): Promise<{ ok: boolean }> {
  const parsedReaction = reactionSchema.safeParse(reaction);
  if (!uuidSchema.safeParse(id).success || !parsedReaction.success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("react_to_message", { p_id: id, p_reaction: parsedReaction.data });
  if (error) return { ok: false };
  revalidatePath(`/letters/${id}`);
  return { ok: true };
}
