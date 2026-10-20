import { isMood, type Mood } from "./character-options";

const DAY = 24 * 3600 * 1000;

/** A mood older than a day no longer says how they feel now. */
export function freshMood(m: { mood: string; updated_at: string } | null, nowMs: number): Mood | null {
  return m && isMood(m.mood) && nowMs - new Date(m.updated_at).getTime() < DAY ? m.mood : null;
}
