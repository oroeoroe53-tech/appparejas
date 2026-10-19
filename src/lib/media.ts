/** Shared rules for files in the private "couple-media" bucket. */

export const MEDIA_BUCKET = "couple-media";
export const MAX_VOICE_SECONDS = 120;
export const MAX_IMAGE_SIDE = 1600;

export type MediaKind = "voice" | "drawing" | "photos" | "story";

const EXT: Record<MediaKind, readonly string[]> = {
  voice: ["webm", "m4a", "ogg"],
  drawing: ["png"],
  photos: ["jpg", "png", "webp"],
  story: ["jpg", "png", "webp"],
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

/** <space>/<kind>/<uuid>.<ext>, exactly the layout the storage policies and database checks expect. */
export function mediaPath(spaceId: string, kind: MediaKind, ext: string): string {
  if (!EXT[kind].includes(ext)) throw new Error(`Unsupported extension for ${kind}`);
  return `${spaceId}/${kind}/${crypto.randomUUID()}.${ext}`;
}

export function isMediaPath(path: string, spaceId: string, kind: MediaKind): boolean {
  const re = new RegExp(`^${spaceId}/${kind}/${UUID}\\.(${EXT[kind].join("|")})$`);
  return re.test(path);
}

/** Recorder output type -> storage content type and file extension. */
export function audioFormat(mime: string): { contentType: string; ext: "webm" | "m4a" | "ogg" } {
  const base = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base === "audio/mp4" || base === "audio/x-m4a" || base === "audio/aac") return { contentType: "audio/mp4", ext: "m4a" };
  if (base === "audio/ogg") return { contentType: "audio/ogg", ext: "ogg" };
  return { contentType: "audio/webm", ext: "webm" };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
