import type { Metadata } from "next";
import { BookHeart, CalendarHeart, ListChecks, MessageCircleQuestion, Music2, Ticket } from "lucide-react";
import Link from "next/link";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { TogetherForm } from "@/components/us/TogetherForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { renderFrames } from "@/lib/character";
import { requireSpace } from "@/server/guards";
import { getCharacters, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Us" };
export const dynamic = "force-dynamic";

export default async function UsPage() {
  const ctx = await requireSpace({ allowEnded: true });
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const { mine } = await getCharacters(ctx.user.id);
  return (
    <>
      <PageHeader title={t.us.title} subtitle={t.us.subtitle} />
      <div className="space-y-4">
        <Link href="/us/character" className="flex items-center gap-4 rounded-3xl bg-paper p-4 shadow-soft transition active:scale-[0.99]">
          <span className="h-16 w-16 shrink-0">
            {mine ? (
              <CharacterFigure frames={renderFrames(mine)} label={t.character.previewAlt(partnerName)} interactive={false} className="h-16 w-16" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-rose text-rose" aria-hidden>+</span>
            )}
          </span>
          <span>
            <span className="block font-serif text-lg">{t.us.sections.character}</span>
            <span className="block text-sm text-muted">{t.us.sections.characterHint}</span>
          </span>
        </Link>
        {[
          { href: "/us/plans", Icon: CalendarHeart, title: t.us.sections.plans, hint: t.us.sections.plansHint },
          { href: "/us/story", Icon: BookHeart, title: t.us.sections.story, hint: t.us.sections.storyHint },
          { href: "/us/questions", Icon: MessageCircleQuestion, title: t.us.sections.questions, hint: t.us.sections.questionsHint },
          { href: "/us/dreams", Icon: ListChecks, title: t.us.sections.dreams, hint: t.us.sections.dreamsHint },
          { href: "/us/coupons", Icon: Ticket, title: t.us.sections.coupons, hint: t.us.sections.couponsHint },
          { href: "/us/playlist", Icon: Music2, title: t.us.sections.playlist, hint: t.us.sections.playlistHint },
        ].map(({ href, Icon, title, hint }) => (
          <Link key={href} href={href} className="flex items-center gap-4 rounded-3xl bg-paper p-4 shadow-soft transition active:scale-[0.99]">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-rose-soft text-cherry"><Icon className="h-7 w-7" aria-hidden /></span>
            <span>
              <span className="block font-serif text-lg">{title}</span>
              <span className="block text-sm text-muted">{hint}</span>
            </span>
          </Link>
        ))}
        <section className="rounded-3xl border border-line p-5">
          <TogetherForm initial={ctx.space.togetherSince} today={new Date().toISOString().slice(0, 10)} />
        </section>
      </div>
    </>
  );
}
