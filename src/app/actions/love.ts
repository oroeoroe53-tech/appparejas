"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/content";
import { dbErrorCode } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { pushEvent } from "@/server/notify";
import { getAppContext, getLetter } from "@/server/queries";
import { lookupSong } from "@/server/songs";
import type { FormState } from "./types";

const uuid = z.string().uuid();
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));

// ---- dreams ----
const dreamSchema = z.object({
  title: z.string().trim().min(1).max(120),
  note: optionalText(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().transform((v) => v || null),
});

export async function addDreamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = dreamSchema.safeParse({ title: formData.get("title"), note: formData.get("note") ?? undefined, date: formData.get("date") ?? undefined });
  if (!parsed.success) return { error: t.dreams.errors.title };
  const supabase = await createClient();
  const { error } = await supabase.from("dreams").insert({ title: parsed.data.title, note: parsed.data.note, target_date: parsed.data.date });
  if (error) return { error: t.dreams.errors.generic };
  revalidatePath("/us/dreams");
  return { notice: t.common.saved };
}

export async function toggleDreamAction(id: string, done: boolean): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("dreams").update({ done }).eq("id", id);
  revalidatePath("/us/dreams");
  return { ok: !error };
}

export async function deleteDreamAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("dreams").delete().eq("id", id);
  revalidatePath("/us/dreams");
  return { ok: !error };
}

// ---- coupons ----
const couponSchema = z.object({ title: z.string().trim().min(1).max(80), description: optionalText(300) });

export async function giveCouponAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = couponSchema.safeParse({ title: formData.get("title"), description: formData.get("description") ?? undefined });
  if (!parsed.success) return { error: t.coupons.errors.title };
  const ctx = await getAppContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("give_coupon", { p_title: parsed.data.title, p_description: parsed.data.description });
  if (error) return { error: dbErrorCode(error) === "rate_limited" ? t.write.errors.rateLimited : t.coupons.errors.generic };
  if (ctx?.space?.partner) {
    await pushEvent({
      fromUserId: ctx.user.id,
      toUserId: ctx.space.partner.id,
      tag: `coupon-${Date.now()}`,
      url: "/us/coupons",
      fullBody: (name) => t.coupons.pushGiven(name, parsed.data.title),
      genericBody: t.coupons.pushGivenGeneric,
    });
  }
  revalidatePath("/us/coupons");
  revalidatePath("/home");
  return { notice: t.common.saved };
}

export async function redeemCouponAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const ctx = await getAppContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_coupon", { p_id: id });
  if (error) return { ok: false };
  const coupon = data as { giver_id: string; title: string };
  if (ctx) {
    await pushEvent({
      fromUserId: ctx.user.id,
      toUserId: coupon.giver_id,
      tag: `coupon-used-${id}`,
      url: "/us/coupons",
      fullBody: (name) => t.coupons.pushUsed(name, coupon.title),
      genericBody: t.coupons.pushUsedGeneric,
    });
  }
  revalidatePath("/us/coupons");
  revalidatePath("/home");
  return { ok: true };
}

export async function withdrawCouponAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_coupon", { p_id: id });
  revalidatePath("/us/coupons");
  revalidatePath("/home");
  return { ok: !error };
}

// ---- playlist ----
async function addTrack(trackId: string, note: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const track = await lookupSong(trackId);
  if (!track) return { ok: false, error: t.playlist.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_playlist_song", {
    p_song: { track_id: track.trackId, title: track.title, artist: track.artist, preview_url: track.previewUrl, artwork_url: track.artworkUrl },
    p_note: note,
  });
  if (error) {
    if ((error.message ?? "").includes("already_added")) return { ok: false, error: t.playlist.already };
    return { ok: false, error: dbErrorCode(error) === "rate_limited" ? t.write.errors.rateLimited : t.playlist.errors.generic };
  }
  revalidatePath("/us/playlist");
  return { ok: true };
}

export async function addPlaylistSongAction(input: { trackId: string; note?: string }): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{1,20}$/.test(input.trackId)) return { ok: false, error: t.playlist.errors.generic };
  const note = (input.note ?? "").trim().slice(0, 140) || null;
  const res = await addTrack(input.trackId, note);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Saves the song attached to a letter. The track id comes from the stored message, never from the browser. */
export async function saveLetterSongAction(messageId: string): Promise<{ ok: boolean; error?: string }> {
  if (!uuid.safeParse(messageId).success) return { ok: false, error: t.playlist.errors.generic };
  const message = await getLetter(messageId);
  if (!message?.song_track_id) return { ok: false, error: t.playlist.errors.generic };
  const res = await addTrack(message.song_track_id, null);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export async function removePlaylistSongAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_playlist_song", { p_id: id });
  revalidatePath("/us/playlist");
  return { ok: !error };
}
