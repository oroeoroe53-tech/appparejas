import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { NextUp } from "@/components/home/NextUp";
import { QuestionCard } from "@/components/us/Forms";
import { questionForDay } from "@/content/questions";
import { toDayNumber, todayIso, upcoming } from "@/lib/dates";
import { signedUrls } from "@/server/media";
import { MoodPicker } from "@/components/character/MoodPicker";
import { CharacterStage, freshMood } from "@/components/home/CharacterStage";
import { InlineMessages } from "@/components/home/InlineMessages";
import { HugButton } from "@/components/home/HugButton";
import { PingButton, QuickSend } from "@/components/home/QuickSend";
import { isCeremony } from "@/lib/message-types";
import { SealedLetter } from "@/components/home/SealedLetter";
import { LetterRow } from "@/components/letters/LetterRow";
import { TypeGlyph } from "@/components/letters/TypeGlyph";
import { ButtonLink } from "@/components/ui/Button";
import { t } from "@/content";
import { dayPart, formatTime, formatToday } from "@/lib/utils";
import { redirect } from "next/navigation";
import { requireSpace } from "@/server/guards";
import { getAnswers, getCharacters, getCoupons, getEvents, getLetters, getMoods, getReasons, getUnreadLetters, getUser, partnerAnswered, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.home };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const today = todayIso(new Date());
  // Everything below needs only the user id, so it all travels in ONE wave together with the space check.
  const [ctx, unread, recent, moods, characters, events, answers, theyAnswered, coupons, reasons] = await Promise.all([
    requireSpace({ allowEnded: true }),
    getUnreadLetters(user.id),
    getLetters(user.id, { filter: "all", query: "", limit: 4 }),
    getMoods(),
    getCharacters(user.id),
    getEvents(),
    getAnswers(4),
    partnerAnswered(today),
    getCoupons(),
    getReasons(),
  ]);
  const theirReasons = reasons.filter((r) => r.created_by !== ctx.user.id);
  const reasonOfDay = theirReasons.length > 0 ? theirReasons[toDayNumber(today) % theirReasons.length] : null;
  const waitingCoupons = coupons.filter((c) => c.receiver_id === ctx.user.id && c.status === "available").length;
  const comingUp = upcoming({ events, togetherSince: ctx.space.togetherSince, today, horizon: 45 });
  const myAnswer = answers.find((a) => a.day === today && a.user_id === ctx.user.id)?.answer ?? null;
  const theirAnswer = answers.find((a) => a.day === today && a.user_id !== ctx.user.id)?.answer ?? null;
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const now = new Date();
  const sealedUnread = unread.filter((m) => isCeremony(m.message_type));
  const plainUnread = unread.filter((m) => !isCeremony(m.message_type));
  const mediaUrls = await signedUrls(plainUnread.map((m) => m.attachment_path ?? ""));
  const [first, ...rest] = sealedUnread;
  const ended = ctx.space.status === "ended";
  const hasLetters = recent.items.length > 0;

  return (
    <div className="pb-6">
      <header className="pt-8">
        <p className="text-xs tracking-[0.2em] text-muted uppercase">{formatToday(now)}</p>
        <h1 className="mt-2 font-serif text-[2.2rem] leading-[1.1] tracking-tight">{t.home.greeting(dayPart(now.getHours()), ctx.profile.display_name)}</h1>
      </header>

      <CharacterStage
        partnerName={partnerName}
        partnerConfig={characters.mine}
        partnerMood={moods.find((m) => m.user_id !== ctx.user.id) ?? null}
        togetherSince={ctx.space.togetherSince}
        nowMs={now.getTime()}
        partnerTimezone={ctx.space.partner?.timezone ?? null}
        unread={unread.length}
      />

      {!ended && (
        <div className="mt-6 space-y-3">
          <QuickSend partnerName={partnerName} />
          <div className="flex flex-wrap items-start justify-center gap-x-3">
            <PingButton partnerName={partnerName} />
            <HugButton partnerName={partnerName} them={characters.mine} me={characters.theirs} />
          </div>
          <ButtonLink href="/write" variant="secondary" className="w-full">{hasLetters || first ? t.home.writeLetter : t.home.emptyCta}</ButtonLink>
        </div>
      )}

      {ended && <p role="status" className="mt-6 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.home.endedBanner}</p>}

      <InlineMessages items={plainUnread.map((m) => ({ id: m.id, type: m.message_type, content: m.content, createdAt: m.created_at, media: m.attachment_path && mediaUrls[m.attachment_path] ? { url: mediaUrls[m.attachment_path] as string, seconds: m.attachment_seconds } : undefined }))} senderName={partnerName} hug={{ them: characters.mine, me: characters.theirs }} />

      <section className="mt-8" aria-label={t.home.waitingForYou}>
        {first ? (
          <>
            <SealedLetter id={first.id} type={first.message_type} senderName={partnerName} when={formatTime(first.created_at)} />
            <p className="mt-3 text-center text-sm text-muted">{sealedUnread.length === 1 ? t.home.oneWaiting : t.home.manyWaiting(sealedUnread.length)}</p>
            {rest.length > 0 && (
              <div className="mt-6">
                <h2 className="mb-3 text-xs tracking-[0.2em] text-muted uppercase">{t.home.moreWaiting}</h2>
                <ul className="scrollbar-none -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
                  {rest.map((m) => (
                    <li key={m.id} className="shrink-0">
                      <Link href={`/letters/${m.id}`} className="flex w-32 flex-col items-center gap-2 rounded-2xl bg-paper px-3 py-4 text-center shadow-soft" aria-label={`${t.types[m.message_type].name}, ${formatTime(m.created_at)}`}>
                        <TypeGlyph type={m.message_type} size={44} />
                        <span className="text-xs text-muted">{t.types[m.message_type].name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : hasLetters ? (
          <div className="rounded-[2rem] bg-paper px-6 py-10 text-center shadow-soft">
            <h2 className="font-serif text-2xl">{t.home.nothingWaiting}</h2>
            <p className="mx-auto mt-2 max-w-[30ch] text-[15px] text-muted">{t.home.allCaughtUp}</p>
          </div>
        ) : (
          <div className="rounded-[2rem] bg-paper px-6 py-12 text-center shadow-soft">
            <svg viewBox="0 0 120 80" className="mx-auto mb-6 w-32" fill="none" aria-hidden>
              <rect x="10" y="12" width="100" height="62" rx="8" stroke="var(--c-rose)" strokeWidth="2" strokeDasharray="5 6" />
              <path d="M12 16l48 34 48-34" stroke="var(--c-rose)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <h2 className="font-serif text-2xl">{t.home.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-[28ch] text-[15px] text-muted">{t.home.emptyBody}</p>
          </div>
        )}
      </section>


      {!ended && (
        <div className="mt-10 space-y-4">
          <h2 className="text-xs tracking-[0.22em] text-muted uppercase">{t.home.today}</h2>
          {reasonOfDay && (
            <Link href="/us/jar" className="paper block rounded-md px-5 py-4 shadow-soft">
              <p className="text-[11px] tracking-[0.18em] text-[#8a6d66] uppercase">{t.jar.today} · {t.jar.todayFrom(partnerName)}</p>
              <p className="mt-2 font-serif text-[1.15rem] italic leading-snug">{reasonOfDay.content}</p>
            </Link>
          )}
          <QuestionCard question={questionForDay(toDayNumber(today))} partnerName={partnerName} myAnswer={myAnswer} partnerAnswer={theirAnswer} partnerAnswered={theyAnswered} />
          {waitingCoupons > 0 && (
            <Link href="/us/coupons" className="flex items-center gap-3 rounded-3xl border-2 border-dashed border-rose bg-paper px-4 py-3.5 text-[15px]">
              <Ticket className="h-5 w-5 text-cherry" aria-hidden /> {t.coupons.youHave(waitingCoupons)}
            </Link>
          )}
          <NextUp items={comingUp} />
        </div>
      )}

      <div className="mt-10">
        <MoodPicker current={freshMood(moods.find((m) => m.user_id === ctx.user.id) ?? null, now.getTime())} />
      </div>

      {hasLetters && (
        <section className="mt-10" aria-labelledby="recent-title">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="recent-title" className="font-serif text-xl">{t.home.recent}</h2>
            <Link href="/letters" className="text-sm text-cherry underline-offset-4 hover:underline">{t.home.seeAll}</Link>
          </div>
          <ul className="space-y-3">
            {recent.items.map((l) => (
              <li key={l.id}><LetterRow letter={l} userId={ctx.user.id} partnerName={partnerName} /></li>
            ))}
          </ul>
        </section>
      )}
      {recent.error && <p role="alert" className="mt-6 text-sm text-cherry">{t.home.loadError}</p>}
    </div>
  );
}
