import type { Metadata } from "next";
import Link from "next/link";
import { CharacterCreator } from "@/components/character/CharacterCreator";
import { CharacterFigure } from "@/components/character/CharacterFigure";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { renderFrames } from "@/lib/character";
import { requireSpace } from "@/server/guards";
import { getCharacters, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Your character" };
export const dynamic = "force-dynamic";

export default async function CharacterPage() {
  const ctx = await requireSpace();
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const { mine, theirs } = await getCharacters(ctx.user.id);
  return (
    <>
      <PageHeader title={t.character.createTitle(partnerName)} subtitle={t.character.createBody(partnerName)} />
      <CharacterCreator initial={mine} partnerName={partnerName} />
      <section className="mt-12 border-t border-line pt-8" aria-labelledby="seen-by">
        <h2 id="seen-by" className="font-serif text-xl">{t.character.seenBy(partnerName)}</h2>
        {theirs ? (
          <div className="mt-4 text-center">
            <CharacterFigure frames={renderFrames(theirs)} label={t.character.previewAlt(ctx.profile.display_name)} className="mx-auto h-40 w-40" />
            <p className="mt-3 text-sm text-muted">{t.character.seenByBody(partnerName)}</p>
          </div>
        ) : (
          <p className="mt-2 text-[15px] text-muted">{t.character.notYet(partnerName)}</p>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
