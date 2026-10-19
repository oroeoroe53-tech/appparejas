import type { Metadata } from "next";
import { LetterView } from "@/components/letters/LetterView";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { getLetter, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Letter", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSpace({ allowEnded: true });
  // RLS guarantees only the sender or recipient can ever get a row back, whatever id is in the URL.
  const letter = await getLetter(id);

  if (!letter) {
    return (
      <>
        <PageHeader title={t.experience.notFoundTitle} subtitle={t.experience.notFoundBody} />
        <ButtonLink href="/letters" variant="secondary">{t.experience.backToLetters}</ButtonLink>
      </>
    );
  }

  const isRecipient = letter.recipient_id === ctx.user.id;
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  return (
    <div className="pt-8">
      <LetterView
        id={letter.id}
        type={letter.message_type}
        text={letter.content}
        createdAt={letter.created_at}
        readAt={letter.read_at}
        reaction={letter.reaction}
        isRecipient={isRecipient}
        senderName={isRecipient ? partnerName : ctx.profile.display_name}
        partnerName={partnerName}
      />
    </div>
  );
}
