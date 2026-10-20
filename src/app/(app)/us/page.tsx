import type { Metadata } from "next";
import { BookHeart, BookOpen, CalendarHeart, Images, ListChecks, MailOpen, MessageCircleQuestion, Music2, Sparkles, Ticket } from "lucide-react";
import Link from "next/link";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { PageHeader } from "@/components/ui/PageHeader";
import { HubTile } from "@/components/us/HubTile";
import { TogetherForm } from "@/components/us/TogetherForm";
import { itemTitle, whenLabel } from "@/components/us/labels";
import { t } from "@/content";
import { renderStill } from "@/lib/character";
import { todayIso, upcoming } from "@/lib/dates";
import { daysTogether } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { redirect } from "next/navigation";
import { MoodPicker } from "@/components/character/MoodPicker";
import { freshMood } from "@/lib/mood";
import { getCharacters, getEvents, getHubSummary, getMoods, getUser, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.us };
export const dynamic = "force-dynamic";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9" aria-label={title}>
      <h2 className="mb-3 text-xs tracking-[0.22em] text-muted uppercase">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

export default async function UsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const now = new Date();
  const today = todayIso(now);
  const [ctx, { mine, theirs }, summary, events, moods] = await Promise.all([requireSpace({ allowEnded: true }), getCharacters(user.id), getHubSummary(user.id, today), getEvents(), getMoods()]);
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const covers = await signedUrls([summary.albumCoverPath ?? ""]);
  const cover = summary.albumCoverPath ? covers[summary.albumCoverPath] : undefined;
  const next = upcoming({ events, togetherSince: ctx.space.togetherSince, today, horizon: 365 })[0];
  const days = ctx.space.togetherSince ? daysTogether(ctx.space.togetherSince, now) : null;

  return (
    <>
      <PageHeader title={t.us.title} subtitle={t.us.subtitle} />

      <section aria-label={t.hub.groups.people} className="relative overflow-hidden rounded-[2rem] bg-paper p-5 shadow-soft">
        <div className="pointer-events-none absolute -left-10 -top-14 h-48 w-48 rounded-full bg-rose/30 blur-3xl" aria-hidden />
        <div className="relative flex items-center justify-center">
          <div className="-mr-3 text-center">
            {mine ? (
              <CharacterFigure frames={renderStill(mine)} label={t.character.previewAlt(partnerName)} className="h-28 w-28" interactive={false} />
            ) : (
              <span className="grid h-28 w-28 place-items-center rounded-full border-2 border-dashed border-rose text-3xl text-rose" aria-hidden>+</span>
            )}
            <p className="mt-2 max-w-[7rem] truncate font-serif text-sm">{partnerName}</p>
          </div>
          <div className="-ml-3 text-center">
            {theirs ? (
              <CharacterFigure frames={renderStill(theirs)} label={t.character.previewAlt(ctx.profile.display_name)} className="h-28 w-28" interactive={false} />
            ) : (
              <span className="grid h-28 w-28 place-items-center rounded-full border-2 border-dashed border-line text-3xl text-stone" aria-hidden>?</span>
            )}
            <p className="mt-2 max-w-[7rem] truncate font-serif text-sm">{ctx.profile.display_name}</p>
          </div>
        </div>
        {days !== null && <p className="relative mt-3 text-center text-sm text-cherry">{t.us.dayCount(days)}</p>}
        <div className="relative mt-4 flex flex-wrap justify-center gap-2 text-sm">
          <Link href="/us/character" className="inline-flex min-h-10 items-center rounded-full bg-cherry px-5 font-medium text-on-cherry">{t.hub.edit}</Link>
        </div>
      </section>

      <section className="mt-6" aria-label={t.hub.mood}>
        <MoodPicker current={freshMood(moods.find((m) => m.user_id === user.id) ?? null, now.getTime())} />
      </section>

      <Group title={t.hub.groups.moments}>
        <HubTile href="/us/albums" title={t.us.sections.albums} preview={t.hub.albums(summary.albums)} Icon={Images} accent="sky" wide={Boolean(cover)}>
          {cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" loading="lazy" className="relative mt-3 h-28 w-full rounded-2xl object-cover" />
          )}
        </HubTile>
        <HubTile href="/us/story" title={t.us.sections.story} preview={t.hub.story(summary.story, summary.latestStory)} Icon={BookHeart} accent="sand" />
        <HubTile href="/us/book" title={t.hub.book} preview={t.book.hubPreview} Icon={BookOpen} accent="rose" wide />
        <HubTile href="/us/playlist" title={t.us.sections.playlist} preview={t.hub.playlist(summary.playlist, summary.latestSong ? `${summary.latestSong.title} · ${summary.latestSong.artist}` : null)} Icon={Music2} accent="lavender" wide />
      </Group>

      <Group title={t.hub.groups.ahead}>
        <HubTile href="/us/plans" title={t.us.sections.plans} preview={t.hub.plans(next ? `${itemTitle(next)} · ${whenLabel(next.daysAway)}` : null)} Icon={CalendarHeart} accent="peach" badge={next && next.daysAway <= 7 ? whenLabel(next.daysAway) : null} />
        <HubTile href="/us/dreams" title={t.us.sections.dreams} preview={t.hub.dreams(summary.dreamsDone, summary.dreamsTotal)} Icon={ListChecks} accent="sage" />
      </Group>

      <Group title={t.hub.groups.gestures}>
        <HubTile href="/us/questions" title={t.us.sections.questions} preview={t.hub.question(summary.answeredToday)} Icon={MessageCircleQuestion} accent="rose" badge={summary.answeredToday ? null : "•"} />
        <HubTile href="/us/jar" title={t.us.sections.jar} preview={t.hub.jar(summary.reasonsMine, summary.reasonsTheirs)} Icon={Sparkles} accent="sand" badge={summary.reasonsTheirs > 0 ? String(summary.reasonsTheirs) : null} />
        <HubTile href="/us/coupons" title={t.us.sections.coupons} preview={t.hub.coupons(summary.couponsForMe, summary.couponsFromMe)} Icon={Ticket} accent="peach" badge={summary.couponsForMe > 0 ? String(summary.couponsForMe) : null} />
        <HubTile href="/us/open-when" title={t.us.sections.openWhen} preview={t.hub.openWhen(summary.openWhenForMe)} Icon={MailOpen} accent="lavender" badge={summary.openWhenForMe > 0 ? String(summary.openWhenForMe) : null} />
      </Group>

      <details className="mt-9 rounded-3xl border border-line p-5">
        <summary className="cursor-pointer text-[15px] font-medium">{t.hub.together}</summary>
        <div className="mt-4"><TogetherForm initial={ctx.space.togetherSince} today={today} /></div>
      </details>
    </>
  );
}
