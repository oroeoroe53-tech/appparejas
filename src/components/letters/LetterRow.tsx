import Link from "next/link";
import { t } from "@/content";
import { formatDateTime, truncate } from "@/lib/utils";
import type { LetterListItem } from "@/server/queries";
import { TypeGlyph } from "./TypeGlyph";

export function LetterRow({ letter, userId, partnerName }: { letter: LetterListItem; userId: string; partnerName: string }) {
  const mine = letter.sender_id === userId;
  const title = mine ? t.letters.toThem(partnerName) : t.letters.fromThem(partnerName);
  return (
    <Link
      href={`/letters/${letter.id}`}
      className="flex items-center gap-4 rounded-2xl bg-paper px-4 py-3.5 shadow-soft transition active:scale-[0.99]"
    >
      <span className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-rose-soft">
        <TypeGlyph type={letter.message_type} size={40} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-[15px] font-medium">
          <span className="truncate">{title}</span>
          {letter.sealed && <span className="h-2 w-2 shrink-0 rounded-full bg-cherry" aria-hidden />}
          {letter.sealed && <span className="sr-only">{t.common.unread}</span>}
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted">
          {letter.sealed ? t.letters.sealedByType(t.types[letter.message_type].name) : truncate(letter.content, 70)}
        </span>
      </span>
      <time dateTime={letter.created_at} className="shrink-0 text-xs text-muted">
        {formatDateTime(letter.created_at).split(" · ")[0]}
      </time>
    </Link>
  );
}
