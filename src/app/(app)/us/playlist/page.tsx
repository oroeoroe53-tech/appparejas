import type { Metadata } from "next";
import Link from "next/link";
import { removePlaylistSongAction } from "@/app/actions/love";
import { SongPlayer } from "@/components/songs/SongPlayer";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaylistAdd } from "@/components/us/LoveForms";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { getPlaylist, partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Our playlist" };
export const dynamic = "force-dynamic";

export default async function PlaylistPage() {
  const ctx = await requireSpace();
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  const songs = await getPlaylist();
  return (
    <>
      <PageHeader title={t.playlist.title} subtitle={t.playlist.subtitle} />
      <PlaylistAdd />
      <section className="mt-10" aria-label={t.playlist.title}>
        {songs.length === 0 ? (
          <p className="text-[15px] text-muted">{t.playlist.empty}</p>
        ) : (
          <ul className="space-y-4">
            {songs.map((s) => (
              <li key={s.id}>
                <SongPlayer clip={{ trackId: s.song_track_id, title: s.song_title, artist: s.song_artist, previewUrl: s.song_preview_url, artworkUrl: s.song_artwork_url, start: 0, duration: 30 }} />
                <div className="mt-1.5 flex items-center justify-between gap-3 px-2 text-xs text-muted">
                  <span className="min-w-0 truncate">
                    {t.playlist.addedBy(s.added_by === ctx.user.id ? t.playlist.you : partnerName)}
                    {s.note ? ` · “${s.note}”` : ""}
                  </span>
                  {s.added_by === ctx.user.id && <DeleteButton action={removePlaylistSongAction} id={s.id} label={t.playlist.remove} confirmLabel={t.playlist.removeConfirm} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-[11px] text-muted">{t.song.attribution}</p>
      </section>
      <p className="mt-6"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
