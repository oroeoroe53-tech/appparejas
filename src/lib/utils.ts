import { LOCALE } from "@/content/locale";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function initials(name: string): string {
  const trimmed = name.trim();
  return trimmed ? (Array.from(trimmed)[0] ?? "?").toUpperCase() : "?";
}

export function truncate(text: string, max: number): string {
  const chars = Array.from(text.replace(/\s+/g, " ").trim());
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { weekday: "long", day: "numeric", month: "long" });
const dayFmt = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" });

export const formatToday = (d = new Date()) => dateFmt.format(d);
export const formatDay = (iso: string) => dayFmt.format(new Date(iso));
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => `${formatDay(iso)} · ${formatTime(iso)}`;
export const formatMonth = (iso: string) => monthFmt.format(new Date(iso));

export function dayPart(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

/** "just now" / "12 min ago" / "3 h ago" / "yesterday" (copy comes from the caller). */
export function timeAgoParts(iso: string, now = Date.now()): { unit: "now" | "minutes" | "hours" | "days"; n: number } {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 2) return { unit: "now", n: 0 };
  if (minutes < 60) return { unit: "minutes", n: minutes };
  if (minutes < 60 * 24) return { unit: "hours", n: Math.floor(minutes / 60) };
  return { unit: "days", n: Math.floor(minutes / (60 * 24)) };
}

/** Day 1 is the day you got together. Dates are compared as calendar days (UTC). */
export function daysTogether(since: string, now = new Date()): number {
  const start = Date.UTC(Number(since.slice(0, 4)), Number(since.slice(5, 7)) - 1, Number(since.slice(8, 10)));
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.floor((today - start) / 86400000) + 1);
}
