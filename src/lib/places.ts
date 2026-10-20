/** Where photos were taken: small pure helpers plus two best-effort lookups against free public services. */
import { LOCALE } from "@/content/locale";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  /** Human-readable name, e.g. "Lisboa, Portugal". May be empty when it could not be looked up. */
  name: string;
}

export const isLatLng = (lat: unknown, lng: unknown): lat is number =>
  typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

/** About one metre of precision is plenty, and keeps the stored values tidy. */
export const roundCoord = (n: number): number => Math.round(n * 1e5) / 1e5;

export interface Pin<T> extends LatLng {
  key: string;
  items: T[];
}

/** Photos taken at (nearly) the same spot share one pin. 3 decimals is roughly 100 m. */
export function groupByPlace<T extends { lat: number | null; lng: number | null }>(items: T[]): Array<Pin<T>> {
  const map = new Map<string, Pin<T>>();
  for (const item of items) {
    if (item.lat === null || item.lng === null) continue;
    const key = `${item.lat.toFixed(3)},${item.lng.toFixed(3)}`;
    const pin = map.get(key);
    if (pin) pin.items.push(item);
    else map.set(key, { key, lat: item.lat, lng: item.lng, items: [item] });
  }
  return [...map.values()];
}

/** Free geocoding by Open-Meteo (no key). Only the text you type is sent. */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.slice(0, 80))}&count=6&language=${LOCALE}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("search_failed");
  const body = (await res.json()) as { results?: Array<{ name: string; admin1?: string; country?: string; latitude: number; longitude: number }> };
  return (body.results ?? []).map((r) => ({
    lat: roundCoord(r.latitude),
    lng: roundCoord(r.longitude),
    name: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(", ").slice(0, 120),
  }));
}

/** Names a point on the map (BigDataCloud's free client endpoint). Returns "" when it cannot. */
export async function nameForPoint({ lat, lng }: LatLng, signal?: AbortSignal): Promise<string> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=${LOCALE}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return "";
    const b = (await res.json()) as { city?: string; locality?: string; principalSubdivision?: string; countryName?: string };
    const first = b.city || b.locality || b.principalSubdivision || "";
    return [first, b.countryName].filter(Boolean).join(", ").slice(0, 120);
  } catch {
    return "";
  }
}

/** Reads GPS position and date from a photo, on the device, before the metadata is stripped. Never throws. */
export async function readPhotoMeta(file: File): Promise<{ position: LatLng | null; takenOn: string | null }> {
  try {
    const exifr = await import("exifr");
    const meta = (await exifr.parse(file, { gps: true, pick: ["DateTimeOriginal", "latitude", "longitude"] })) as
      | { latitude?: number; longitude?: number; DateTimeOriginal?: Date }
      | undefined;
    const position = meta && isLatLng(meta.latitude, meta.longitude) ? { lat: roundCoord(meta.latitude as number), lng: roundCoord(meta.longitude as number) } : null;
    const d = meta?.DateTimeOriginal;
    const takenOn = d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;
    return { position, takenOn };
  } catch {
    return { position: null, takenOn: null };
  }
}
