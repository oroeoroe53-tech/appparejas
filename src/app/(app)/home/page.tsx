import type { Metadata } from "next";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { HugButton } from "@/components/home/HugButton";
import { LocalClock } from "@/components/home/LocalClock";
import { PingButton, QuickSend } from "@/components/home/QuickSend";
import { SongSend } from "@/components/home/SongSend";
import { ButtonLink } from "@/components/ui/Button";
import { t } from "@/content";
import { renderFrames, sceneAt } from "@/lib/character";
import { sanitizeCharacter } from "@/lib/character-options";
import { freshMood } from "@/lib/mood";
import { daysTogether, timeAgoParts } from "@/lib/utils";
import { redirect } from "next/navigation";
import { requireSpace } from "@/server/guards";
import { getCharacters, getMoods, getUnreadLetters, getUser, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.home };
export const dynamic = "force-dynamic";

function agoLabel(iso: string, nowMs: number): string {
  const { unit, n } = timeAgoParts(iso, nowMs);
  return unit === "now" ? t.time.now : unit === "minutes" ? t.time.minutes(n) : unit === "hours" ? t.time.hours(n) : t.time.yesterday;
}

/** Home: just your person, big and alive, with every way of saying something to them. */
export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  // One wave: the space check and everything this page needs travel together.
  const [ctx, { mine, theirs }, moods, unread] = await Promise.all([
    requireSpace({ allowEnded: true }),
    getCharacters(user.id),
    getMoods(),
    getUnreadLetters(user.id),
  ]);
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const now = new Date();
  const theirRow = moods.find((m) => m.user_id !== ctx.user.id) ?? null;
  const mood = freshMood(theirRow, now.getTime());
  const scene = sceneAt(now.getTime(), ctx.space.partner?.timezone);
  const days = ctx.space.togetherSince ? daysTogether(ctx.space.togetherSince, now) : null;
  const tint = mine ? sanitizeCharacter(mine).backgroundColor : "f9d5dc";
  const ended = ctx.space.status === "ended";

  return (
    <div className="relative -mx-5 min-h-[calc(100dvh-5rem)] px-5 pb-6 pt-8" style={{ background: `radial-gradient(120% 70% at 50% 18%, #${tint}cc 0%, transparent 70%)` }}>
      {mine ? (
        <div className="flex flex-col items-center text-center">
          <CharacterFigure
            frames={renderFrames(mine, mood ?? "neutral", scene)}
            label={`${t.character.previewAlt(partnerName)}. ${scene === "night" ? t.character.asleep(partnerName) : t.character.sunny(partnerName)}`}
            className="h-[min(78vw,340px)] w-[min(78vw,340px)]"
            envelope={unread.length > 0 ? t.character.envelope(partnerName) : undefined}
            envelopeHref="/letters"
          />
          <h1 className="mt-6 font-serif text-[2.4rem] leading-none tracking-tight">{partnerName}</h1>
          <p className="mt-2 text-[15px] text-muted">
            {mood && theirRow ? t.mood.feels(partnerName, t.mood.labels[mood], agoLabel(theirRow.updated_at, now.getTime())) : t.mood.quiet(partnerName)}
          </p>
          {mood && theirRow?.note && <p className="mx-auto mt-2 max-w-[30ch] italic">“{theirRow.note}”</p>}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            {ctx.space.partner?.timezone && <LocalClock timezone={ctx.space.partner.timezone} name={partnerName} className="rounded-full bg-paper/80 px-3 py-1.5 text-muted shadow-soft" />}
            {days !== null && <span className="rounded-full bg-paper/80 px-3 py-1.5 text-muted shadow-soft">{t.portrait.day(days)}</span>}
          </div>
          <p className="mt-3 text-[11px] text-muted">{t.character.tapHint}</p>
        </div>
      ) : (
        <div className="mt-16 text-center">
          <p className="font-serif text-2xl">{t.portrait.noCharacter(partnerName)}</p>
          <p className="mx-auto mt-2 max-w-[30ch] text-sm text-muted">{t.character.placeholderBody}</p>
          <ButtonLink href="/us/character" className="mt-6">{t.character.createCta(partnerName)}</ButtonLink>
        </div>
      )}
      {ended ? (
        <p role="status" className="mt-6 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.home.endedBanner}</p>
      ) : (
        <div className="mx-auto mt-8 max-w-md space-y-3">
          <QuickSend partnerName={partnerName} />
          <PingButton partnerName={partnerName} />
          <HugButton partnerName={partnerName} them={mine} me={theirs} />
          <SongSend partnerName={partnerName} />
        </div>
      )}
    </div>
  );
}
