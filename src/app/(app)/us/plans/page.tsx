import type { Metadata } from "next";
import Link from "next/link";
import { deleteEventAction } from "@/app/actions/shared";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EventForm } from "@/components/us/Forms";
import { itemTitle, whenLabel } from "@/components/us/labels";
import { t } from "@/content";
import { nextOccurrence, todayIso, upcoming } from "@/lib/dates";
import { formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getEvents } from "@/server/queries";

export const metadata: Metadata = { title: "Plans" };
export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const ctx = await requireSpace();
  const events = await getEvents();
  const today = todayIso(new Date());
  const coming = upcoming({ events, togetherSince: ctx.space.togetherSince, today, horizon: 800 });
  const past = events.filter((e) => nextOccurrence(e.event_date, e.repeat_yearly, today) === null).reverse();
  const byId = new Map(events.map((e) => [e.id, e]));

  return (
    <>
      <PageHeader title={t.plans.title} subtitle={t.plans.subtitle} />
      <EventForm today={today} />
      <section className="mt-10" aria-labelledby="coming">
        <h2 id="coming" className="mb-3 font-serif text-xl">{t.plans.upcoming}</h2>
        {coming.length === 0 ? (
          <p className="text-[15px] text-muted">{t.plans.empty}</p>
        ) : (
          <ul className="space-y-3">
            {coming.map((i) => {
              const ev = i.source === "event" ? byId.get(i.key.slice(2)) : undefined;
              return (
                <li key={i.key} className="flex items-center gap-3 rounded-2xl bg-paper px-4 py-3.5 shadow-soft">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">{itemTitle(i)}</p>
                    <p className="text-sm text-muted">{formatDay(i.date)}{i.note ? ` · ${i.note}` : ""}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-rose-soft px-3 py-1 text-xs text-cherry-deep">{whenLabel(i.daysAway)}</span>
                  {ev && ev.created_by === ctx.user.id && <DeleteButton action={deleteEventAction} id={ev.id} label={t.plans.remove} confirmLabel={t.plans.removeConfirm} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {past.length > 0 && (
        <section className="mt-10" aria-labelledby="past">
          <h2 id="past" className="mb-3 font-serif text-xl">{t.plans.past}</h2>
          <ul className="space-y-2">
            {past.map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{e.title}</span>
                <span className="text-muted">{formatDay(e.event_date)}</span>
                {e.created_by === ctx.user.id && <DeleteButton action={deleteEventAction} id={e.id} label={t.plans.remove} confirmLabel={t.plans.removeConfirm} />}
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
