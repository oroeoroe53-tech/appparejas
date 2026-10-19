import { z } from "zod";

export const SONG_PREVIEW_SECONDS = 30;
export const SONG_MIN_CLIP = 3;

/** A song clip attached to a message: the Apple preview plus the part the sender picked. */
export interface SongClip {
  trackId: string;
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string | null;
  start: number;
  duration: number;
}

export type SongResult = Omit<SongClip, "start" | "duration">;

/** Mirrors the database check: only Apple-hosted https URLs are ever stored or played. */
const APPLE_AUDIO = /^https:\/\/([a-z0-9-]+\.)*(itunes\.apple\.com|mzstatic\.com)\/\S*$/;
const APPLE_IMAGE = /^https:\/\/([a-z0-9-]+\.)*mzstatic\.com\/\S*$/;

export const isApplePreviewUrl = (url: string) => APPLE_AUDIO.test(url) && url.length <= 1000;
export const isAppleArtworkUrl = (url: string) => APPLE_IMAGE.test(url) && url.length <= 1000;

export function clampClip(start: number, duration: number): { start: number; duration: number } {
  const d = Math.min(Math.max(Math.round(duration), SONG_MIN_CLIP), SONG_PREVIEW_SECONDS);
  const s = Math.min(Math.max(Math.round(start), 0), Math.min(29, SONG_PREVIEW_SECONDS - d));
  return { start: s, duration: d };
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Client -> server. The server never trusts the title/URL from the client; it re-fetches by trackId. */
export const songInputSchema = z
  .object({
    trackId: z.string().regex(/^\d{1,20}$/),
    start: z.number().int().min(0).max(29),
    duration: z.number().int().min(SONG_MIN_CLIP).max(SONG_PREVIEW_SECONDS),
  })
  .refine((v) => v.start + v.duration <= SONG_PREVIEW_SECONDS, { message: "clip" });

export type SongInput = z.infer<typeof songInputSchema>;

const itunesTrack = z.object({
  trackId: z.number().int().positive(),
  trackName: z.string().trim().min(1).max(200),
  artistName: z.string().trim().min(1).max(200),
  previewUrl: z.string().refine(isApplePreviewUrl),
  artworkUrl100: z.string().refine(isAppleArtworkUrl).optional(),
});

/** Parses the iTunes Search/Lookup API payload, dropping anything that isn't a playable, Apple-hosted song. */
export function parseItunesResults(payload: unknown): SongResult[] {
  const results = (payload as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: SongResult[] = [];
  for (const raw of results) {
    const parsed = itunesTrack.safeParse(raw);
    if (!parsed.success) continue;
    const t = parsed.data;
    out.push({
      trackId: String(t.trackId),
      title: t.trackName,
      artist: t.artistName,
      previewUrl: t.previewUrl,
      artworkUrl: t.artworkUrl100 ?? null,
    });
  }
  return out;
}
