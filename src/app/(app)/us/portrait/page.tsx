import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { freshMood } from "@/components/home/CharacterStage";
import { LocalClock } from "@/components/home/LocalClock";
import { HugButton } from "@/components/home/HugButton";
import { PingButton, QuickSend } from "@/components/home/QuickSend";
import { ButtonLink } from "@/components/ui/Button";
import { t } from "@/content";
import { renderFrames, sceneAt } from "@/lib/character";
import { sanitizeCharacter } from "@/lib/character-options";
import { daysTogether } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getCharacters, getMoods, getUnreadLetters, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.portrait };
export const dynamic = "force-dynamic";

/** A calm, full-screen portrait of your person: big, alive, with a way to say something right here. */
export default async function PortraitPage() {
  const ctx = await requireSpace({ allowEnded: true });
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const [{ mine, theirs }, moods, unread] = await Promise.all([getCharacters(ctx.user.id), getMoods(), getUnreadLetters(ctx.user.id)]);
  const now = new Date();
  const theirRow = moods.find((m) => m.user_id !== ctx.user.id) ?? null;
  const mood = freshMood(theirRow, now.getTime());
  const scene = sceneAt(now.getTime(), ctx.space.partner?.timezone);
  const days = ctx.space.togetherSince ? daysTogether(ctx.space.togetherSince, now) : null;
  const tint = mine ? sanitizeCharacter(mine).backgroundColor : "f9d5dc";

  return (
    <div className="relative -mx-5 min-h-[calc(100dvh-8rem)] px-5 pb-6 pt-6" style={{ background: `radial-gradient(120% 70% at 50% 18%, #${tint}cc 0%, transparent 70%)` }}>
      <Link href="/home" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted"><ArrowLeft className="h-4 w-4" aria-hidden /> {t.portrait.close}</Link>
      {mine ? (
        <div className="mt-4 flex flex-col items-center text-center">
          <CharacterFigure frames={renderFrames(mine, mood ?? "neutral", scene)} label={`${t.character.previewAlt(partnerName)}. ${scene === "night" ? t.character.asleep(partnerName) : t.character.sunny(partnerName)}`} envelope={unread.length > 0 ? t.character.envelope(partnerName) : undefined} className="h-[min(78vw,340px)] w-[min(78vw,340px)]" />
          <h1 className="mt-6 font-serif text-[2.4rem] leading-none tracking-tight">{partnerName}</h1>
          <p className="mt-2 text-[15px] text-muted">{mood && theirRow ? t.mood.feelsNow(partnerName, t.mood.labels[mood]) : t.mood.quiet(partnerName)}</p>
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
          <ButtonLink href="/us/character" className="mt-6">{t.character.createCta(partnerName)}</ButtonLink>
        </div>
      )}
      {ctx.space.status === "active" && (
        <div className="mx-auto mt-8 max-w-md space-y-3">
          <QuickSend partnerName={partnerName} />
          <div className="flex flex-wrap items-start justify-center gap-x-3">
            <PingButton partnerName={partnerName} />
            <HugButton partnerName={partnerName} them={mine} me={theirs} />
          </div>
        </div>
      )}
    </div>
  );
}
