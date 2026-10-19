import type { Metadata } from "next";
import Link from "next/link";
import { deleteStoryAction } from "@/app/actions/shared";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { StoryForm } from "@/components/us/Forms";
import { t } from "@/content";
import { todayIso } from "@/lib/dates";
import { formatDay } from "@/lib/utils";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { getStory } from "@/server/queries";

export const metadata: Metadata = { title: "Our story" };
export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const [ctx, entries] = await Promise.all([requireSpace(), getStory()]);
  const urls = await signedUrls(entries.map((e) => e.photo_path ?? ""));
  return (
    <>
      <PageHeader title={t.story.title} subtitle={t.story.subtitle} />
      <StoryForm today={todayIso(new Date())} spaceId={ctx.space.id} />
      {entries.length === 0 ? (
        <p className="mt-10 text-[15px] leading-relaxed text-muted">{t.story.empty}</p>
      ) : (
        <ol className="relative mt-10 space-y-8 border-l border-line pl-6">
          {entries.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-cherry ring-4 ring-cream" aria-hidden />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <time dateTime={e.happened_on} className="text-xs tracking-[0.15em] text-cherry uppercase">{formatDay(e.happened_on)}</time>
                  <h2 className="mt-1 font-serif text-xl leading-snug">{e.title}</h2>
                </div>
                {e.created_by === ctx.user.id && <DeleteButton action={deleteStoryAction} id={e.id} label={t.story.remove} confirmLabel={t.story.removeConfirm} />}
              </div>
              {e.photo_path && urls[e.photo_path] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls[e.photo_path]} alt={e.title} loading="lazy" className="mt-3 max-h-80 w-full rounded-2xl object-cover" />
              )}
              {e.note && <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-muted">{e.note}</p>}
            </li>
          ))}
        </ol>
      )}
      <p className="mt-10"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
