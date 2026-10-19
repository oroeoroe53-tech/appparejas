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

const dateFmt = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" });
const dayFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" });
const monthFmt = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

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
