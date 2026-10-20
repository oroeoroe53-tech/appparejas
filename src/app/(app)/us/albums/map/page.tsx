import type { Metadata } from "next";
import Link from "next/link";
import { PhotoMap, type MapPhoto } from "@/components/media/PhotoMap";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { getPhotos } from "@/server/queries";

export const metadata: Metadata = { title: t.meta.titles.photoMap };
export const dynamic = "force-dynamic";

export default async function PhotoMapPage() {
  const [, photos] = await Promise.all([requireSpace(), getPhotos()]);
  const located = photos.filter((p) => p.lat !== null && p.lng !== null);
  const urls = await signedUrls(located.map((p) => p.storage_path));
  const items: MapPhoto[] = located
    .filter((p) => urls[p.storage_path])
    .map((p) => ({ id: p.id, albumId: p.album_id, url: urls[p.storage_path] as string, caption: p.caption, takenOn: p.taken_on, lat: p.lat as number, lng: p.lng as number, place: p.place }));
  return (
    <>
      <PageHeader title={t.albums.map.title} subtitle={t.albums.map.subtitle} />
      {items.length === 0 ? <p className="text-[15px] leading-relaxed text-muted">{t.albums.map.empty}</p> : <PhotoMap photos={items} />}
      <p className="mt-8"><Link href="/us/albums" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
