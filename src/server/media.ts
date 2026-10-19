import "server-only";
import { MEDIA_BUCKET } from "@/lib/media";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Short-lived links to private files. Created with the user's own session, so storage policies apply. */
export async function signedUrls(paths: string[], expiresIn = 3600): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};
  const supabase = await createClient();
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrls(unique, expiresIn);
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  return out;
}

/** Deletes files the signed-in user uploaded (storage policy: uploader only). */
export async function removeMyFiles(paths: string[]): Promise<void> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  const supabase = await createClient();
  await supabase.storage.from(MEDIA_BUCKET).remove(unique);
}

const KINDS = ["voice", "drawing", "photos", "story"];

/** Removes every file of a couple space. Used when the last person leaves, so nothing is orphaned. */
export async function purgeSpaceMedia(spaceId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const bucket = admin.storage.from(MEDIA_BUCKET);
  for (const kind of KINDS) {
    for (;;) {
      const { data } = await bucket.list(`${spaceId}/${kind}`, { limit: 100 });
      if (!data || data.length === 0) break;
      const { error } = await bucket.remove(data.map((f) => `${spaceId}/${kind}/${f.name}`));
      if (error) break;
    }
  }
}

/** Removes the files tied to one person's content (messages they sent or received, photos and story photos they added). */
export async function purgeUserMedia(userId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const paths: string[] = [];
  const [{ data: messages }, { data: photos }, { data: story }] = await Promise.all([
    admin.from("messages").select("attachment_path").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`).not("attachment_path", "is", null),
    admin.from("photos").select("storage_path").eq("created_by", userId),
    admin.from("timeline_entries").select("photo_path").eq("created_by", userId).not("photo_path", "is", null),
  ]);
  for (const m of (messages ?? []) as Array<{ attachment_path: string }>) paths.push(m.attachment_path);
  for (const p of (photos ?? []) as Array<{ storage_path: string }>) paths.push(p.storage_path);
  for (const e of (story ?? []) as Array<{ photo_path: string }>) paths.push(e.photo_path);
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from(MEDIA_BUCKET).remove(paths.slice(i, i + 100));
}
