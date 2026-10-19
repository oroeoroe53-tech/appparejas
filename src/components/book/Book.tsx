"use client";

import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { t } from "@/content";
import { cn } from "@/lib/utils";
import "./book.css";
import { Sprinkles, Sticker, Tape } from "./Decor";

export interface BookData {
  names: { me: string; them: string };
  since: string | null;
  sinceLabel: string | null;
  days: number | null;
  figures: { me: string; them: string };
  story: Array<{ id: string; title: string; note: string | null; dateLabel: string; photoUrl: string | null }>;
  photos: Array<{ id: string; url: string; caption: string; dateLabel: string }>;
  letters: Array<{ id: string; from: string; style: string; text: string; dateLabel: string }>;
  reasons: Array<{ id: string; text: string; by: string }>;
  questions: Array<{ day: string; question: string; answers: Array<{ name: string; text: string }> }>;
  songs: Array<{ id: string; title: string; artist: string; art: string | null; note: string | null; by: string }>;
  dreams: Array<{ id: string; title: string; note: string | null; doneLabel: string | null }>;
}

type Chapter = "story" | "photos" | "letters" | "reasons" | "questions" | "songs" | "dreams";
const CHAPTERS: Chapter[] = ["story", "photos", "letters", "reasons", "questions", "songs", "dreams"];
const PAPER = ["#fde8ec", "#e8f4ec", "#fff4d6", "#efe8fb", "#e3f1f9", "#ffeadb"];
const TAPES = ["#f6c1cc", "#bfe3cf", "#ffe29a", "#d9c9f3", "#bddcf0", "#ffd0b0"];

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function Page({ n, children, grow, className }: { n: number; children: React.ReactNode; grow?: boolean; className?: string }) {
  return (
    <section className={cn("book-page", className)} data-grow={grow ? "" : undefined} style={{ ["--bp" as string]: PAPER[n % PAPER.length] }}>
      <Sprinkles n={n} />
      {children}
    </section>
  );
}

function ChapterHead({ title, n }: { title: string; n: number }) {
  return (
    <header className="mb-[4cqw] text-center">
      <h2 className="bk-title text-[7.4cqw] leading-tight">{title}</h2>
      <svg viewBox="0 0 120 14" className="mx-auto mt-[1.4cqw] w-[26cqw]" aria-hidden="true">
        <path d="M2 8c12-8 22 8 34 0s22 8 34 0 22 8 34 0" fill="none" stroke={TAPES[n % TAPES.length]} strokeWidth="4" strokeLinecap="round" />
      </svg>
    </header>
  );
}

/** The whole keepsake: choose what goes inside, preview it page by page, print or save as PDF. */
export function Book({ data }: { data: BookData }) {
  const [title, setTitle] = useState<string>(t.book.defaultTitle);
  const [on, setOn] = useState<Record<Chapter, boolean>>(() => ({
    story: data.story.length > 0,
    photos: data.photos.length > 0,
    letters: data.letters.length > 0,
    reasons: data.reasons.length > 0,
    questions: data.questions.length > 0,
    songs: data.songs.length > 0,
    dreams: data.dreams.length > 0,
  }));

  const pages = useMemo(() => {
    const out: React.ReactNode[] = [];
    let n = 0;
    const next = () => n++;

    // Cover
    out.push(
      <Page key="cover" n={0} className="items-center justify-center text-center" >
        <Tape className="left-[8cqw] top-[10cqw]" rotate={-18} />
        <Tape className="right-[8cqw] top-[10cqw]" color={TAPES[1]} rotate={16} />
        <p className="bk-hand mt-[6cqw] text-[5.4cqw] opacity-80">{data.sinceLabel ? t.book.cover.since(data.sinceLabel) : ""}</p>
        <h1 className="bk-title mt-[2cqw] max-w-[80cqw] text-[11cqw] leading-[1.05] text-[var(--bk-rose)]">{title || t.book.defaultTitle}</h1>
        <div className="relative mt-[7cqw] flex items-center justify-center">
          <div className="-mr-[5cqw] h-[34cqw] w-[34cqw] overflow-hidden rounded-full bg-white ring-[1.4cqw] ring-white shadow-lg [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={data.names.them} dangerouslySetInnerHTML={{ __html: data.figures.them }} />
          <div className="-ml-[5cqw] h-[34cqw] w-[34cqw] overflow-hidden rounded-full bg-white ring-[1.4cqw] ring-white shadow-lg [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={data.names.me} dangerouslySetInnerHTML={{ __html: data.figures.me }} />
          <Sticker name="heart" size={12} style={{ left: "50%", top: "-6cqw", transform: "translateX(-50%) rotate(8deg)" }} />
        </div>
        <p className="bk-hand mt-[7cqw] text-[7cqw]">{t.book.cover.pair(data.names.them, data.names.me)}</p>
        {data.days !== null && <p className="mt-[1.5cqw] text-[3.6cqw] tracking-[0.18em] uppercase opacity-70">{t.book.cover.days(data.days)}</p>}
      </Page>,
    );
    next();

    // Inside cover
    out.push(
      <Page key="dedication" n={next()} className="items-center justify-center text-center">
        <p className="text-[3.6cqw] tracking-[0.22em] uppercase opacity-70">{t.book.dedication}</p>
        <p className="bk-hand mt-[4cqw] text-[11cqw] leading-none text-[var(--bk-rose)]">{t.book.cover.pair(data.names.them, data.names.me)}</p>
        <Sticker name="envelope" size={20} style={{ position: "relative", marginTop: "8cqw" }} />
        <p className="bk-hand mt-[6cqw] max-w-[70cqw] text-[6cqw] leading-snug">{t.book.dedicationLine}</p>
      </Page>,
    );

    if (on.story && data.story.length > 0) {
      chunk(data.story, 3).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`story-${gi}`} n={pn}>
            {gi === 0 ? <ChapterHead title={t.book.chapters.story} n={pn} /> : <div className="h-[4cqw]" />}
            <ol className="relative flex flex-1 flex-col gap-[3.6cqw] border-l-[0.7cqw] border-dotted border-[var(--bk-rose)]/50 pl-[6cqw]">
              {group.map((e) => (
                <li key={e.id} className="bk-note relative p-[3.4cqw]">
                  <span aria-hidden="true" className="absolute -left-[8.2cqw] top-[3cqw] grid h-[4.6cqw] w-[4.6cqw] place-items-center rounded-full bg-[var(--bk-rose)] text-white" />
                  <p className="bk-hand text-[4.4cqw] text-[var(--bk-rose)]">{e.dateLabel}</p>
                  <p className="bk-title text-[4.8cqw] leading-snug">{e.title}</p>
                  {e.note && <p className="mt-[0.8cqw] text-[3.6cqw] leading-snug opacity-85">{e.note}</p>}
                  {e.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.photoUrl} alt="" className="mt-[2cqw] h-[24cqw] w-full rounded-[2cqw] object-cover" />
                  )}
                </li>
              ))}
            </ol>
          </Page>,
        );
      });
    }

    if (on.photos && data.photos.length > 0) {
      chunk(data.photos, 2).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`photos-${gi}`} n={pn}>
            {gi === 0 ? <ChapterHead title={t.book.chapters.photos} n={pn} /> : <div className="h-[3cqw]" />}
            <div className="flex flex-1 flex-col justify-around gap-[4cqw] px-[4cqw]">
              {group.map((p, i) => (
                <figure key={p.id} className="bk-polaroid mx-auto w-[56cqw]" style={{ transform: `rotate(${i % 2 === 0 ? -3 : 3}deg)` }}>
                  <Tape className="-top-[3cqw] left-[17cqw]" color={TAPES[(pn + i) % TAPES.length]} rotate={i % 2 === 0 ? 3 : -5} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={t.book.photoAlt(p.caption)} />
                  <figcaption className="bk-hand absolute inset-x-[2.6cqw] bottom-[1.6cqw] truncate text-center text-[4.6cqw]">{p.caption || p.dateLabel}</figcaption>
                </figure>
              ))}
            </div>
          </Page>,
        );
      });
    }

    if (on.letters && data.letters.length > 0) {
      data.letters.forEach((l) => {
        const pn = next();
        out.push(
          <Page key={`letter-${l.id}`} n={pn} grow>
            <p className="text-[3.2cqw] tracking-[0.2em] uppercase opacity-60">{t.book.chapters.letters}</p>
            <div className="bk-note mt-[3cqw] flex-1 p-[6cqw]">
              <p className="bk-hand text-[4.6cqw] text-[var(--bk-rose)]">{l.dateLabel}</p>
              <p className="bk-hand mt-[2cqw] whitespace-pre-line text-[5.2cqw] leading-[1.35]">{l.text}</p>
              <p className="bk-hand mt-[5cqw] text-right text-[5.6cqw] text-[var(--bk-rose)]">{t.book.letterFrom(l.from)}</p>
            </div>
          </Page>,
        );
      });
    }

    if (on.reasons && data.reasons.length > 0) {
      chunk(data.reasons, 7).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`reasons-${gi}`} n={pn}>
            {gi === 0 ? <ChapterHead title={t.book.chapters.reasons} n={pn} /> : <div className="h-[4cqw]" />}
            <ul className="flex flex-1 flex-col justify-around gap-[2.4cqw]">
              {group.map((r, i) => (
                <li key={r.id} className="bk-note flex items-start gap-[3cqw] p-[3cqw]" style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` }}>
                  <Sticker name="heart" size={6.5} style={{ position: "relative", flex: "none", marginTop: "0.6cqw" }} />
                  <div>
                    <p className="bk-hand text-[5cqw] leading-tight">{r.text}</p>
                    <p className="mt-[0.4cqw] text-[3cqw] opacity-60">{t.book.reasonBy(r.by)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Page>,
        );
      });
    }

    if (on.questions && data.questions.length > 0) {
      chunk(data.questions, 2).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`questions-${gi}`} n={pn} grow>
            {gi === 0 ? <ChapterHead title={t.book.chapters.questions} n={pn} /> : <div className="h-[4cqw]" />}
            <div className="flex flex-1 flex-col gap-[4cqw]">
              {group.map((q) => (
                <article key={q.day} className="bk-note p-[4cqw]">
                  <p className="bk-title text-[4.6cqw] leading-snug text-[var(--bk-rose)]">{q.question}</p>
                  <div className="mt-[2cqw] space-y-[1.6cqw]">
                    {q.answers.map((a) => (
                      <p key={a.name} className="text-[3.8cqw] leading-snug">
                        <span className="bk-hand text-[4.4cqw] opacity-70">{t.book.answerBy(a.name)}: </span>
                        {a.text}
                      </p>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </Page>,
        );
      });
    }

    if (on.songs && data.songs.length > 0) {
      chunk(data.songs, 6).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`songs-${gi}`} n={pn}>
            {gi === 0 ? <ChapterHead title={t.book.chapters.songs} n={pn} /> : <div className="h-[4cqw]" />}
            <ul className="flex flex-1 flex-col justify-around gap-[2.4cqw]">
              {group.map((s) => (
                <li key={s.id} className="bk-note flex items-center gap-[3.4cqw] p-[2.6cqw]">
                  {s.art ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.art} alt="" className="h-[14cqw] w-[14cqw] flex-none rounded-[2cqw] object-cover" />
                  ) : (
                    <span className="grid h-[14cqw] w-[14cqw] flex-none place-items-center rounded-[2cqw] bg-[#efe8fb] text-[7cqw]" aria-hidden="true">♪</span>
                  )}
                  <div className="min-w-0">
                    <p className="bk-title truncate text-[4.4cqw]">{s.title}</p>
                    <p className="truncate text-[3.4cqw] opacity-70">{s.artist}</p>
                    {s.note && <p className="bk-hand truncate text-[4cqw] text-[var(--bk-rose)]">“{s.note}”</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Page>,
        );
      });
    }

    if (on.dreams && data.dreams.length > 0) {
      chunk(data.dreams, 7).forEach((group, gi) => {
        const pn = next();
        out.push(
          <Page key={`dreams-${gi}`} n={pn}>
            {gi === 0 ? <ChapterHead title={t.book.chapters.dreams} n={pn} /> : <div className="h-[4cqw]" />}
            <ul className="flex flex-1 flex-col justify-around gap-[2.4cqw]">
              {group.map((d) => (
                <li key={d.id} className="bk-note flex items-start gap-[3cqw] p-[3cqw]">
                  <Sticker name="star" size={7} style={{ position: "relative", flex: "none" }} />
                  <div>
                    <p className="bk-title text-[4.4cqw] leading-snug">{d.title}</p>
                    {d.note && <p className="text-[3.4cqw] opacity-75">{d.note}</p>}
                    {d.doneLabel && <p className="bk-hand text-[4cqw] text-[var(--bk-rose)]">{t.book.doneOn(d.doneLabel)}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </Page>,
        );
      });
    }

    out.push(
      <Page key="end" n={next()} className="items-center justify-center text-center">
        <Sticker name="heart" size={22} style={{ position: "relative" }} />
        <h2 className="bk-title mt-[6cqw] text-[9cqw]">{t.book.endTitle}</h2>
        <p className="bk-hand mt-[3cqw] max-w-[64cqw] text-[6cqw] leading-snug">{t.book.endLine}</p>
        <p className="mt-[16cqw] text-[3cqw] tracking-[0.22em] uppercase opacity-50">{t.book.madeWith}</p>
      </Page>,
    );
    return out;
  }, [data, on, title]);

  const anything = CHAPTERS.some((c) => data[c].length > 0);

  return (
    <div className="book-root">
      <div className="book-toolbar space-y-5">
        <div>
          <label htmlFor="book-title" className="mb-1.5 block text-sm font-medium">{t.book.titleLabel}</label>
          <input
            id="book-title"
            value={title}
            maxLength={40}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
          />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t.book.optionsTitle}</legend>
          <div className="flex flex-wrap gap-2">
            {CHAPTERS.map((c) => {
              const count = data[c].length;
              const disabled = count === 0;
              return (
                <label key={c} className={cn("inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition", on[c] && !disabled ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper", disabled && "cursor-not-allowed opacity-45")}>
                  <input type="checkbox" className="sr-only" checked={on[c] && !disabled} disabled={disabled} onChange={(e) => setOn((s) => ({ ...s, [c]: e.target.checked }))} />
                  {t.book.options[c]} <span className="text-xs opacity-75">{count}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div>
          <button type="button" onClick={() => window.print()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 font-medium text-on-cherry shadow-soft transition active:scale-[0.98]">
            <Printer className="h-5 w-5" aria-hidden /> {t.book.print}
          </button>
          <p className="mt-2 text-xs text-muted">{t.book.printHint}</p>
        </div>
        {!anything && <p role="status" className="rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.book.notReady}</p>}
        <h2 className="pt-2 text-xs tracking-[0.2em] text-muted uppercase">{t.book.previewTitle}</h2>
      </div>

      <div className="book-stack mt-3 flex flex-col gap-6">{pages}</div>
    </div>
  );
}

