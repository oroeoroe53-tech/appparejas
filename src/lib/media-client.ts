import { createClient } from "@/lib/supabase/browser";
import { MAX_IMAGE_SIDE, MEDIA_BUCKET, mediaPath, type MediaKind } from "./media";

const MAX_BYTES = 6 * 1024 * 1024;

/**
 * Resizes a photo and re-encodes it as JPEG. Drawing it onto a canvas drops all metadata (EXIF),
 * including GPS location, before the image ever leaves the device.
 */
export async function compressImage(file: File, maxSide = MAX_IMAGE_SIDE, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("not_image");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no_canvas");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("encode_failed");
  return blob;
}

/** Uploads to the private couple folder with the signed-in user's session. Returns the storage path. */
export async function uploadMedia(spaceId: string, kind: MediaKind, blob: Blob, ext: string, contentType: string): Promise<string> {
  if (blob.size > MAX_BYTES) throw new Error("too_big");
  const path = mediaPath(spaceId, kind, ext);
  const { error } = await createClient().storage.from(MEDIA_BUCKET).upload(path, blob, { contentType, upsert: false, cacheControl: "3600" });
  if (error) throw new Error("upload_failed");
  return path;
}

/** Best effort cleanup when a later step fails (the storage policy only lets the uploader delete). */
export async function discardUpload(path: string): Promise<void> {
  await createClient().storage.from(MEDIA_BUCKET).remove([path]).catch(() => undefined);
}
