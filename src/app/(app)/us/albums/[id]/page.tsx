import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteAlbumAction } from "@/app/actions/media";
import { PhotoGrid } from "@/components/media/PhotoGrid";
import { PhotoUploader } from "@/components/media/PhotoUploader";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { getAlbum, getPhotos } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.album };
export const dynamic = "force-dynamic";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSpace();
  const album = await getAlbum(id);
  if (!album) notFound();
  const photos = await getPhotos(id);
  const urls = await signedUrls(photos.map((p) => p.storage_path));
  const deleteAndLeave = async (albumId: string) => {
    "use server";
    const res = await deleteAlbumAction(albumId);
    if (res.ok) redirect("/us/albums");
    return res;
  };
  return (
    <>
      <PageHeader
        title={album.title}
        subtitle={t.albums.photos(photos.length)}
        action={album.created_by === ctx.user.id ? <DeleteButton action={deleteAndLeave} id={album.id} label={t.albums.deleteAlbum} confirmLabel={t.albums.deleteAlbumConfirm} /> : undefined}
      />
      <PhotoUploader spaceId={ctx.space.id} albumId={album.id} />
      <div className="mt-8">
        {photos.length === 0 ? (
          <p className="text-[15px] text-muted">{t.albums.emptyAlbum}</p>
        ) : (
          <PhotoGrid photos={photos.filter((p) => urls[p.storage_path]).map((p) => ({ id: p.id, url: urls[p.storage_path] as string, caption: p.caption, takenOn: p.taken_on, lat: p.lat, lng: p.lng, place: p.place, mine: p.created_by === ctx.user.id }))} />
        )}
      </div>
      <p className="mt-8"><Link href="/us/albums" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
