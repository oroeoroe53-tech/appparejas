import { CalendarHeart } from "lucide-react";
import Link from "next/link";
import { t } from "@/content";
import type { UpcomingItem } from "@/lib/dates";
import { itemTitle, whenLabel } from "@/components/us/labels";

export function NextUp({ items }: { items: UpcomingItem[] }) {
  if (items.length === 0) return null;
  return (
    <Link href="/us/plans" className="block rounded-3xl border border-line p-4 transition active:scale-[0.99]">
      <p className="flex items-center gap-2 text-xs tracking-[0.2em] text-cherry uppercase">
        <CalendarHeart className="h-4 w-4" aria-hidden /> {t.plans.nextUp}
      </p>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 2).map((i) => (
          <li key={i.key} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[15px]">{itemTitle(i)}</span>
            <span className="shrink-0 text-sm text-muted">{whenLabel(i.daysAway)}</span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
