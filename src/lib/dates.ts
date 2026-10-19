/** Calendar-day helpers. All dates are "YYYY-MM-DD" strings and are compared as UTC calendar days. */

const DAY_MS = 86_400_000;

export const toDayNumber = (iso: string): number =>
  Math.floor(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / DAY_MS);

export const fromDayNumber = (n: number): string => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const todayIso = (now: Date): string => now.toISOString().slice(0, 10);

export const tomorrowIso = (now: Date): string => fromDayNumber(toDayNumber(todayIso(now)) + 1);

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** The yearly repeat of `iso` that falls in `year` (29 Feb becomes 28 Feb in common years). */
function inYear(iso: string, year: number): string {
  const m = Number(iso.slice(5, 7));
  let d = Number(iso.slice(8, 10));
  if (m === 2 && d === 29 && !isLeap(year)) d = 28;
  return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Next date (today included) the event happens, or null if a one-off event is already in the past. */
export function nextOccurrence(iso: string, repeatYearly: boolean, today: string): string | null {
  if (!repeatYearly) return iso >= today ? iso : null;
  const year = Number(today.slice(0, 4));
  const thisYear = inYear(iso, year);
  return thisYear >= today ? thisYear : inYear(iso, year + 1);
}

export const daysAway = (date: string, today: string): number => toDayNumber(date) - toDayNumber(today);

export const MILESTONE_DAYS = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 4000, 5000];

export interface UpcomingItem {
  key: string;
  title: string;
  date: string;
  daysAway: number;
  source: "event" | "milestone" | "anniversary";
  /** day number for milestones, year number for anniversaries */
  count?: number;
  eventKind?: "anniversary" | "plan" | "birthday";
  note?: string | null;
}

export interface EventRow {
  id: string;
  title: string;
  note: string | null;
  event_date: string;
  repeat_yearly: boolean;
  kind: "anniversary" | "plan" | "birthday";
}

/** Everything coming up within `horizon` days: your events plus automatic milestones and yearly anniversaries. */
export function upcoming(input: { events: EventRow[]; togetherSince: string | null; today: string; horizon?: number }): UpcomingItem[] {
  const { events, togetherSince, today, horizon = 120 } = input;
  const items: UpcomingItem[] = [];
  for (const e of events) {
    const date = nextOccurrence(e.event_date, e.repeat_yearly, today);
    if (!date) continue;
    items.push({ key: `e-${e.id}`, title: e.title, date, daysAway: daysAway(date, today), source: "event", eventKind: e.kind, note: e.note });
  }
  if (togetherSince) {
    const start = toDayNumber(togetherSince);
    for (const n of MILESTONE_DAYS) {
      const date = fromDayNumber(start + n - 1);
      if (date >= today) items.push({ key: `m-${n}`, title: "", date, daysAway: daysAway(date, today), source: "milestone", count: n });
    }
    const next = nextOccurrence(togetherSince, true, today);
    if (next && next !== togetherSince) {
      items.push({ key: "a-next", title: "", date: next, daysAway: daysAway(next, today), source: "anniversary", count: Number(next.slice(0, 4)) - Number(togetherSince.slice(0, 4)) });
    }
  }
  return items.filter((i) => i.daysAway <= horizon).sort((a, b) => a.daysAway - b.daysAway || a.key.localeCompare(b.key));
}
