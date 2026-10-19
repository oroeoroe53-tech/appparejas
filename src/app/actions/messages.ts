"use server";

import { revalidatePath } from "next/cache";
import { MESSAGE_LIMITS } from "@/lib/message-types";
import { dbErrorCode, sendErrorMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { reactionSchema, sendMessageSchema, uuidSchema } from "@/lib/validation";
import { songInputSchema, type SongInput } from "@/lib/songs";
import { notifyRecipient } from "@/server/deliver";
import { removeMyFiles } from "@/server/media";
import { lookupSong } from "@/server/songs";
import type { Message } from "@/lib/types";

export type SendResult =
  | { ok: true; messageId: string; push: "sent" | "skipped" | "failed" | "already_sent" | "scheduled" }
  | { ok: false; error: string };

export async function sendMessageAction(input: {
  content: string;
  type: string;
  clientId: string;
  song?: SongInput | null;
  /** Voice note / drawing already uploaded to the couple folder. */
  attachment?: { path: string; seconds?: number | null } | null;
  /** ISO time for a time-capsule message. */
  deliverAt?: string | null;
}): Promise<SendResult> {
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
    p_attachment: input.attachment ? { path: input.attachment.path, seconds: input.attachment.seconds ?? null } : null,
    p_deliver_at: input.deliverAt ?? null,
  });
  if (error || !data) {
    // A failed send must not leave an orphaned upload behind.
    if (input.attachment) await removeMyFiles([input.attachment.path]).catch(() => undefined);
    return { ok: false, error: sendErrorMessage(dbErrorCode(error)) };
  }

  const { message, is_new } = data as { message: Message; is_new: boolean };
  // A retry of an already-stored draft must never notify twice.
  if (!is_new) return { ok: true, messageId: message.id, push: "already_sent" };

  // Time capsules wait; the daily job nudges the phone when they open.
  const push = message.deliver_at ? "scheduled" : await notifyRecipient(message);
  revalidatePath("/letters");
  revalidatePath("/home");
  return { ok: true, messageId: message.id, push };
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
