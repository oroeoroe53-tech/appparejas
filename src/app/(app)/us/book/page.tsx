import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Book, type BookData } from "@/components/book/Book";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { questionForDay } from "@/content/questions";
import { renderStill } from "@/lib/character";
import { toDayNumber } from "@/lib/dates";
import { daysTogether, formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { getAnswers, getCharacters, getDreams, getLetters, getPhotos, getPlaylist, getReasons, getStory, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.book };
export const dynamic = "force-dynamic";

const LETTER_TYPES = new Set(["love_letter", "little_note", "heart_message", "hug_in_words", "secret_message", "old_letter"]);
const MAX_PHOTOS = 40;

/** A keepsake made from everything you already put in the app. Nothing here is stored twice. */
export default async function BookPage() {
  const ctx = await requireSpace({ allowEnded: true });
  const me = ctx.profile.display_name;
  const them = partnerLabel(ctx.space, t.common.yourPerson);
  const now = new Date();

  const [characters, story, photos, letters, reasons, answers, songs, dreams] = await Promise.all([
    getCharacters(ctx.user.id),
    getStory(),
    getPhotos(),
    getLetters(ctx.user.id, { filter: "all", query: "", limit: 80 }),
    getReasons(),
    getAnswers(200),
    getPlaylist(),
    getDreams(),
  ]);

  const chosenPhotos = photos.slice(0, MAX_PHOTOS);
  const urls = await signedUrls([...chosenPhotos.map((p) => p.storage_path), ...story.map((s) => s.photo_path ?? "")], 3 * 3600);
  const nameOf = (id: string) => (id === ctx.user.id ? me : them);

  const answersByDay = new Map<string, Array<{ user_id: string; answer: string }>>();
  for (const a of answers) answersByDay.set(a.day, [...(answersByDay.get(a.day) ?? []), a]);

  const data: BookData = {
    names: { me, them },
    since: ctx.space.togetherSince,
    sinceLabel: ctx.space.togetherSince ? formatDay(ctx.space.togetherSince) : null,
    days: ctx.space.togetherSince ? daysTogether(ctx.space.togetherSince, now) : null,
    figures: { me: renderStill(characters.theirs).neutral, them: renderStill(characters.mine).neutral },
    story: [...story].reverse().map((s) => ({ id: s.id, title: s.title, note: s.note, dateLabel: formatDay(s.happened_on), photoUrl: s.photo_path ? (urls[s.photo_path] ?? null) : null })),
    photos: [...chosenPhotos]
      .reverse()
      .filter((p) => urls[p.storage_path])
      .map((p) => ({ id: p.id, url: urls[p.storage_path] as string, caption: p.caption ?? "", dateLabel: formatDay(p.taken_on ?? p.created_at.slice(0, 10)) })),
    letters: letters.items
      .filter((l) => LETTER_TYPES.has(l.message_type) && !l.sealed && (!l.deliver_at || new Date(l.deliver_at) <= now))
      .reverse()
      .map((l) => ({ id: l.id, from: nameOf(l.sender_id), style: l.message_type, text: l.content, dateLabel: formatDay(l.created_at.slice(0, 10)) })),
    reasons: [...reasons].reverse().map((r) => ({ id: r.id, text: r.content, by: nameOf(r.created_by) })),
    questions: [...answersByDay.entries()]
      .filter(([, rows]) => rows.length >= 2)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, rows]) => ({
        day,
        question: questionForDay(toDayNumber(day)),
        answers: rows.map((r) => ({ name: nameOf(r.user_id), text: r.answer })),
      })),
    songs: [...songs].reverse().map((s) => ({ id: s.id, title: s.song_title, artist: s.song_artist, art: s.song_artwork_url, note: s.note, by: nameOf(s.added_by) })),
    dreams: dreams.filter((d) => d.done).map((d) => ({ id: d.id, title: d.title, note: d.note, doneLabel: d.done_at ? formatDay(d.done_at.slice(0, 10)) : null })),
  };

  return (
    <>
      <div className="book-toolbar">
        <Link href="/us" className="mt-6 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted"><ArrowLeft className="h-4 w-4" aria-hidden /> {t.us.title}</Link>
        <PageHeader title={t.book.title} subtitle={t.book.subtitle} className="pt-2" />
      </div>
      <Book data={data} />
    </>
  );
}
