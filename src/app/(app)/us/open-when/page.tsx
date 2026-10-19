import type { Metadata } from "next";
import Link from "next/link";
import { deleteOpenWhenAction } from "@/app/actions/gestures";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { OpenWhenCard, OpenWhenForm } from "@/components/us/OpenWhen";
import { t } from "@/content";
import { formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getOpenWhen, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Open when…" };
export const dynamic = "force-dynamic";

export default async function OpenWhenPage() {
  const ctx = await requireSpace();
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const { letters, bodies } = await getOpenWhen();
  const forMe = letters.filter((l) => l.recipient_id === ctx.user.id);
  const fromMe = letters.filter((l) => l.author_id === ctx.user.id);
  return (
    <>
      <PageHeader title={t.openWhen.title} subtitle={t.openWhen.subtitle} />
      <section aria-labelledby="for-me">
        <h2 id="for-me" className="mb-3 font-serif text-xl">{t.openWhen.forYou}</h2>
        {forMe.length === 0 ? (
          <p className="text-[15px] text-muted">{t.openWhen.empty}</p>
        ) : (
          <ul className="space-y-4">
            {forMe.map((l) => (
              <OpenWhenCard key={l.id} id={l.id} label={l.label} style={l.style} content={l.opened_at ? (bodies[l.id] ?? null) : null} senderName={partnerName} openedLabel={l.opened_at ? t.openWhen.opened(formatDay(l.opened_at)) : null} />
            ))}
          </ul>
        )}
      </section>
      <div className="mt-10"><OpenWhenForm /></div>
      <section className="mt-10" aria-labelledby="from-me">
        <h2 id="from-me" className="mb-3 font-serif text-xl">{t.openWhen.fromYou}</h2>
        {fromMe.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-muted">{t.openWhen.emptyFrom}</p>
        ) : (
          <ul className="space-y-2.5">
            {fromMe.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{t.openWhen.openWhenLabel(l.label)}</p>
                  <p className="text-xs text-muted">{l.opened_at ? t.openWhen.opened(formatDay(l.opened_at)) : t.openWhen.waiting}</p>
                </div>
                {!l.opened_at && <DeleteButton action={deleteOpenWhenAction} id={l.id} label={t.openWhen.withdraw} confirmLabel={t.openWhen.withdrawConfirm} />}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
