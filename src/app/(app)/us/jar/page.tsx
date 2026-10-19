import type { Metadata } from "next";
import Link from "next/link";
import { deleteReasonAction } from "@/app/actions/gestures";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { PullReason, ReasonForm } from "@/components/us/Jar";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { getReasons, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Jar of reasons" };
export const dynamic = "force-dynamic";

export default async function JarPage() {
  const ctx = await requireSpace();
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const all = await getReasons();
  const theirs = all.filter((r) => r.created_by !== ctx.user.id);
  const mine = all.filter((r) => r.created_by === ctx.user.id);
  return (
    <>
      <PageHeader title={t.jar.title} subtitle={t.jar.subtitle} />
      <PullReason reasons={theirs.map((r) => r.content)} partnerName={partnerName} />
      <div className="mt-8"><ReasonForm /></div>
      <section className="mt-10" aria-labelledby="mine">
        <h2 id="mine" className="mb-3 flex items-baseline justify-between font-serif text-xl">{t.jar.mine}<span className="text-sm font-normal text-muted">{t.jar.count(mine.length)}</span></h2>
        {mine.length === 0 ? (
          <p className="text-[15px] text-muted">{t.jar.yourEmpty}</p>
        ) : (
          <ul className="space-y-2.5">
            {mine.map((r) => (
              <li key={r.id} className="flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 shadow-soft">
                <span className="min-w-0 flex-1 break-words text-[15px] italic">{r.content}</span>
                <DeleteButton action={deleteReasonAction} id={r.id} label={t.jar.remove} confirmLabel={t.jar.removeConfirm} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
