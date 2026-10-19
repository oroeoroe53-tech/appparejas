import "server-only";
import { parseItunesResults, type SongResult } from "@/lib/songs";

const API = "https://itunes.apple.com";
const TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Searches the Apple catalogue. Returns null when Apple could not be reached (distinct from "no results"). */
export async function searchSongs(term: string, country: string): Promise<SongResult[] | null> {
  const params = new URLSearchParams({ term, media: "music", entity: "song", limit: "12", country });
  const payload = await fetchJson(`${API}/search?${params}`);
  return payload === null ? null : parseItunesResults(payload);
}

/** Canonical data for one track. The server uses this instead of anything the browser claims. */
export async function lookupSong(trackId: string): Promise<SongResult | null> {
  if (!/^\d{1,20}$/.test(trackId)) return null;
  const payload = await fetchJson(`${API}/lookup?${new URLSearchParams({ id: trackId, entity: "song" })}`);
  return payload === null ? null : (parseItunesResults(payload).find((s) => s.trackId === trackId) ?? null);
}

/** "es-ES,es;q=0.9" -> "ES"; falls back to US. */
export function storeCountry(acceptLanguage: string | null): string {
  const match = /[a-z]{2,3}-([A-Za-z]{2})\b/.exec(acceptLanguage ?? "");
  return match?.[1]?.toUpperCase() ?? "US";
}
