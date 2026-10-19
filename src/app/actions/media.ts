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

export async function addPhotoAction(input: { albumId: string; path: string; takenOn?: string | null }): Promise<{ ok: boolean }> {
  const ctx = await getAppContext();
  if (!ctx?.space || !uuid.safeParse(input.albumId).success || !isMediaPath(input.path, ctx.space.id, "photos")) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({ album_id: input.albumId, storage_path: input.path, taken_on: input.takenOn ?? null });
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
