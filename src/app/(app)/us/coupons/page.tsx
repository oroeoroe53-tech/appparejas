import type { Metadata } from "next";
import Link from "next/link";
import { withdrawCouponAction } from "@/app/actions/love";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { CouponForm, UseCouponButton } from "@/components/us/LoveForms";
import { t } from "@/content";
import { cn, formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getCoupons, partnerLabel, type CouponRow } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.coupons };
export const dynamic = "force-dynamic";

function Ticket({ coupon, caption, children }: { coupon: CouponRow; caption: string; children?: React.ReactNode }) {
  const used = coupon.status === "used";
  return (
    <li className={cn("relative rounded-2xl border-2 border-dashed px-5 py-4", used ? "border-line bg-transparent text-muted" : "border-rose bg-paper shadow-soft")}>
      <span className="absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-cream" aria-hidden />
      <span className="absolute -right-2.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-cream" aria-hidden />
      <p className="text-[11px] tracking-[0.2em] text-cherry uppercase">{caption}</p>
      <p className={cn("mt-1 font-serif text-xl leading-snug", used && "line-through decoration-rose")}>{coupon.title}</p>
      {coupon.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted">{coupon.description}</p>}
      {used && coupon.used_at && <p className="mt-2 text-xs text-cherry">{t.coupons.usedOn(formatDay(coupon.used_at))}</p>}
      {children && <div className="mt-3">{children}</div>}
    </li>
  );
}

export default async function CouponsPage() {
  const [ctx, coupons] = await Promise.all([requireSpace(), getCoupons()]);
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const mine = coupons.filter((c) => c.receiver_id === ctx.user.id);
  const given = coupons.filter((c) => c.giver_id === ctx.user.id);
  return (
    <>
      <PageHeader title={t.coupons.title} subtitle={t.coupons.subtitle} />
      <CouponForm />
      <section className="mt-10" aria-labelledby="for-you">
        <h2 id="for-you" className="mb-3 font-serif text-xl">{t.coupons.forYou}</h2>
        {mine.length === 0 ? <p className="text-[15px] text-muted">{t.coupons.emptyForYou}</p> : (
          <ul className="space-y-4">
            {mine.map((c) => (
              <Ticket key={c.id} coupon={c} caption={t.coupons.from(partnerName)}>{c.status === "available" && <UseCouponButton id={c.id} />}</Ticket>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-10" aria-labelledby="from-you">
        <h2 id="from-you" className="mb-3 font-serif text-xl">{t.coupons.fromYou}</h2>
        {given.length === 0 ? <p className="text-[15px] text-muted">{t.coupons.emptyFromYou}</p> : (
          <ul className="space-y-4">
            {given.map((c) => (
              <Ticket key={c.id} coupon={c} caption={t.coupons.to(partnerName)}>
                {c.status === "available" && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-muted">{t.coupons.waiting}</span>
                    <DeleteButton action={withdrawCouponAction} id={c.id} label={t.coupons.withdraw} confirmLabel={t.coupons.withdraw + "?"} />
                  </div>
                )}
              </Ticket>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
