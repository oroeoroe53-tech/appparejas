import type { Metadata } from "next";
import { LetterView } from "@/components/letters/LetterView";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { getLetter, partnerLabel } from "@/server/queries";
import type { SongClip } from "@/lib/songs";
import { signedUrls } from "@/server/media";

export const metadata: Metadata = { title: t.meta.titles.letter, robots: { index: false } };
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
  const mediaUrl = letter.attachment_path ? (await signedUrls([letter.attachment_path]))[letter.attachment_path] : undefined;
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const song: SongClip | null =
    letter.song_track_id && letter.song_title && letter.song_artist && letter.song_preview_url && letter.song_start !== null && letter.song_duration !== null
      ? {
          trackId: letter.song_track_id,
          title: letter.song_title,
          artist: letter.song_artist,
          previewUrl: letter.song_preview_url,
          artworkUrl: letter.song_artwork_url,
          start: letter.song_start,
          duration: letter.song_duration,
        }
      : null;
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
        song={song}
        media={mediaUrl ? { url: mediaUrl, seconds: letter.attachment_seconds } : null}
      />
    </div>
  );
}
