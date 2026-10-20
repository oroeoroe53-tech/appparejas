"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/content";
import { isMediaPath } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { getAppContext, getPhotos } from "@/server/queries";
import { removeMyFiles } from "@/server/media";
import type { FormState } from "./types";

const uuid = z.string().uuid();

export async function createAlbumAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = z.string().trim().min(1).max(80).safeParse(formData.get("title"));
  if (!title.success) return { error: t.albums.errors.title };
  const supabase = await createClient();
  const { error } = await supabase.from("albums").insert({ title: title.data });
  if (error) return { error: t.albums.errors.generic };
  revalidatePath("/us/albums");
  return { notice: t.common.saved };
}

const placeSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  place: z.string().trim().max(120).nullable().optional(),
});
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addPhotoAction(input: { albumId: string; path: string; takenOn?: string | null; location?: { lat: number; lng: number; place?: string | null } | null }): Promise<{ ok: boolean }> {
  const ctx = await getAppContext();
  if (!ctx?.space || !uuid.safeParse(input.albumId).success || !isMediaPath(input.path, ctx.space.id, "photos")) return { ok: false };
  const supabase = await createClient();
  const loc = input.location ? placeSchema.safeParse(input.location) : null;
  const takenOn = input.takenOn && DATE.test(input.takenOn) && input.takenOn >= "1950-01-01" && input.takenOn <= "2100-12-31" ? input.takenOn : null;
  const { error } = await supabase.from("photos").insert({
    album_id: input.albumId,
    storage_path: input.path,
    taken_on: takenOn,
    ...(loc?.success ? { lat: loc.data.lat, lng: loc.data.lng, place: loc.data.place || null } : {}),
  });
  if (error) {
    await removeMyFiles([input.path]).catch(() => undefined);
    return { ok: false };
  }
  revalidatePath(`/us/albums/${input.albumId}`);
  revalidatePath("/us/albums");
  return { ok: true };
}

export async function updateCaptionAction(id: string, caption: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").update({ caption: caption.trim().slice(0, 200) || null }).eq("id", id);
  return { ok: !error };
}

/** Sets (or clears, with null) where a photo was taken. Either of you can do it. */
export async function setPhotoPlaceAction(id: string, location: { lat: number; lng: number; place?: string | null } | null): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const parsed = location ? placeSchema.safeParse(location) : null;
  if (location && !parsed?.success) return { ok: false };
  const supabase = await createClient();
  const values = parsed?.success ? { lat: parsed.data.lat, lng: parsed.data.lng, place: parsed.data.place || null } : { lat: null, lng: null, place: null };
  const { data, error } = await supabase.from("photos").update(values).eq("id", id).select("album_id").maybeSingle();
  if (error || !data) return { ok: false };
  revalidatePath(`/us/albums/${data.album_id}`);
  revalidatePath("/us/albums/map");
  return { ok: true };
}

export async function deletePhotoAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { data } = await supabase.from("photos").select("storage_path, album_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error || !data) return { ok: false };
  await removeMyFiles([(data as { storage_path: string }).storage_path]).catch(() => undefined);
  revalidatePath(`/us/albums/${(data as { album_id: string }).album_id}`);
  revalidatePath("/us/albums");
  return { ok: true };
}

export async function deleteAlbumAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const photos = await getPhotos(id);
  const { error } = await supabase.from("albums").delete().eq("id", id);
  if (error) return { ok: false };
  // Files uploaded by the partner can only be removed by them; the rows are gone either way.
  await removeMyFiles(photos.map((p) => p.storage_path)).catch(() => undefined);
  revalidatePath("/us/albums");
  return { ok: true };
}
