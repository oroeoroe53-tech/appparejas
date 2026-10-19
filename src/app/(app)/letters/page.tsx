import type { Metadata } from "next";
import Link from "next/link";
import { LetterRow } from "@/components/letters/LetterRow";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { formatMonth } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { getLetters, partnerLabel, type LetterFilter } from "@/server/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Our letters" };
export const dynamic = "force-dynamic";

const PAGE = 30;
const FILTERS: LetterFilter[] = ["all", "received", "sent"];

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string; limit?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireSpace({ allowEnded: true });
  const filter = FILTERS.includes(sp.filter as LetterFilter) ? (sp.filter as LetterFilter) : "all";
  const query = (sp.q ?? "").slice(0, 80);
  const limit = Math.min(Math.max(Number.parseInt(sp.limit ?? "", 10) || PAGE, PAGE), 300);
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const { items, hasMore, error } = await getLetters(ctx.user.id, { filter, query, limit });

  const href = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { filter: filter === "all" ? undefined : filter, q: query || undefined, ...over };
    Object.entries(merged).forEach(([k, v]) => v && params.set(k, v));
    const qs = params.toString();
    return qs ? `/letters?${qs}` : "/letters";
  };

  const rows = items.map((l, i) => {
    const month = formatMonth(l.created_at);
    const previous = items[i - 1];
    return { l, heading: previous && formatMonth(previous.created_at) === month ? null : month };
  });
  return (
    <>
      <PageHeader title={t.letters.title} />
      <form action="/letters" method="get" role="search" className="mb-4">
        {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        <label htmlFor="q" className="sr-only">{t.letters.searchLabel}</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder={t.letters.searchPlaceholder}
          className="min-h-12 w-full rounded-full border border-line bg-paper px-5 text-base placeholder:text-stone focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
        />
      </form>
      <nav aria-label={t.letters.filterLabel} className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={href({ filter: f === "all" ? undefined : f })}
            aria-current={f === filter ? "true" : undefined}
            className={cn("inline-flex min-h-10 items-center rounded-full px-4 text-sm transition", f === filter ? "bg-ink text-cream" : "border border-line text-muted hover:text-ink")}
          >
            {t.letters.filters[f]}
          </Link>
        ))}
      </nav>
      {query && <p className="mb-4 text-[13px] text-muted">{t.letters.searchNote}</p>}
      {error && <p role="alert" className="text-sm text-cherry">{t.home.loadError}</p>}
      {!error && items.length === 0 && <p className="py-16 text-center text-muted">{query ? t.letters.emptySearch : t.letters.empty}</p>}
      <ul className="space-y-3">
        {rows.map(({ l, heading }) => (
          <li key={l.id}>
            {heading && <h2 className="mb-2 mt-6 text-xs tracking-[0.2em] text-muted uppercase first:mt-0">{heading}</h2>}
            <LetterRow letter={l} userId={ctx.user.id} partnerName={partnerName} />
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="mt-8 text-center">
          <Link href={href({ limit: String(limit + PAGE) })} className="text-sm text-cherry underline underline-offset-4">{t.letters.loadMore}</Link>
        </div>
      )}
    </>
  );
}
