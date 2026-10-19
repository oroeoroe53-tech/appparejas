import { Maximize2, UserRound } from "lucide-react";
import Link from "next/link";
import { LocalClock } from "./LocalClock";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { ButtonLink } from "@/components/ui/Button";
import { t } from "@/content";
import { renderFrames } from "@/lib/character";
import { isMood, type Mood } from "@/lib/character-options";
import { daysTogether, timeAgoParts } from "@/lib/utils";
import type { MoodRow } from "@/server/queries";

const DAY = 24 * 3600 * 1000;

/** A mood older than a day no longer says how they feel now. */
export function freshMood(m: MoodRow | null, nowMs: number): Mood | null {
  return m && isMood(m.mood) && nowMs - new Date(m.updated_at).getTime() < DAY ? m.mood : null;
}

function agoLabel(iso: string, nowMs: number): string {
  const { unit, n } = timeAgoParts(iso, nowMs);
  return unit === "now" ? t.time.now : unit === "minutes" ? t.time.minutes(n) : unit === "hours" ? t.time.hours(n) : t.time.yesterday;
}

/** Home hero: the person you drew, reacting to how they feel, with the day counter. */
export function CharacterStage({
  partnerName,
  partnerConfig,
  partnerMood,
  togetherSince,
  nowMs,
  partnerTimezone,
}: {
  partnerName: string;
  partnerConfig: unknown | null;
  partnerMood: MoodRow | null;
  togetherSince: string | null;
  nowMs: number;
  partnerTimezone?: string | null;
}) {
  const theirMood = freshMood(partnerMood, nowMs);
  const days = togetherSince ? daysTogether(togetherSince, new Date(nowMs)) : null;

  return (
    <section aria-label={partnerName} className="mt-6">
      <div className="relative overflow-hidden rounded-[2rem] bg-paper px-6 pb-6 pt-8 text-center shadow-soft">
        <div className="pointer-events-none absolute -left-12 -top-16 h-52 w-52 rounded-full bg-rose/30 blur-3xl" aria-hidden />
        {days !== null && (
          <p className="absolute right-5 top-4 rounded-full bg-rose-soft px-3 py-1 text-xs text-cherry-deep">{t.us.dayCount(days)}</p>
        )}
        {partnerConfig ? (
          <>
            <CharacterFigure frames={renderFrames(partnerConfig, theirMood ?? "neutral")} label={t.character.previewAlt(partnerName)} className="mx-auto h-40 w-40" />
            <p className="mt-4 font-serif text-2xl">{partnerName}</p>
            <p className="mt-1 text-sm text-muted">
              {theirMood && partnerMood ? t.mood.feels(partnerName, t.mood.labels[theirMood], agoLabel(partnerMood.updated_at, nowMs)) : t.mood.quiet(partnerName)}
            </p>
            {theirMood && partnerMood?.note && <p className="mx-auto mt-2 max-w-[28ch] text-sm italic">“{partnerMood.note}”</p>}
            {partnerTimezone && <LocalClock timezone={partnerTimezone} name={partnerName} className="mt-1 text-xs text-muted" />}
            <p className="mt-3 text-[11px] text-muted">{t.character.tapHint}</p>
            <Link href="/us/portrait" aria-label={t.portrait.open} className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-rose-soft px-3 py-1.5 text-xs text-cherry-deep">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden /> {t.portrait.open}
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto grid h-36 w-36 place-items-center rounded-full border-2 border-dashed border-rose text-rose" aria-hidden>
              <UserRound className="h-16 w-16" strokeWidth={1.2} />
            </div>
            <p className="mt-4 font-serif text-2xl">{t.character.placeholderTitle(partnerName)}</p>
            <p className="mx-auto mt-2 max-w-[30ch] text-sm text-muted">{t.character.placeholderBody}</p>
            <ButtonLink href="/us/character" className="mt-5">{t.character.createCta(partnerName)}</ButtonLink>
          </>
        )}
      </div>
    </section>
  );
}
