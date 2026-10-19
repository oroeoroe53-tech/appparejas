import { t } from "@/content";
import type { UpcomingItem } from "@/lib/dates";

export const itemTitle = (i: UpcomingItem): string =>
  i.source === "event" ? i.title : i.source === "milestone" ? t.plans.milestoneDay(i.count ?? 0) : t.plans.anniversaryYear(i.count ?? 0);

export const whenLabel = (days: number): string => (days <= 0 ? t.plans.today : days === 1 ? t.plans.tomorrow : t.plans.inDays(days));
