import type { Metadata } from "next";
import Link from "next/link";
import { AlbumForm } from "@/components/media/AlbumForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { signedUrls } from "@/server/media";
import { getAlbums, getPhotos } from "@/server/queries";

export const metadata: Metadata = { title: "Albums" };
export const dynamic = "force-dynamic";

export default async function AlbumsPage() {
  const [, albums, photos] = await Promise.all([requireSpace(), getAlbums(), getPhotos()]);
  const byAlbum = new Map<string, typeof photos>();
  for (const p of photos) byAlbum.set(p.album_id, [...(byAlbum.get(p.album_id) ?? []), p]);
  const covers = await signedUrls(albums.map((a) => byAlbum.get(a.id)?.[0]?.storage_path ?? ""));
  return (
    <>
      <PageHeader title={t.albums.title} subtitle={t.albums.subtitle} />
      <AlbumForm />
      <section className="mt-10" aria-label={t.albums.title}>
        {albums.length === 0 ? (
          <p className="text-[15px] leading-relaxed text-muted">{t.albums.empty}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {albums.map((a) => {
              const items = byAlbum.get(a.id) ?? [];
              const cover = items[0] ? covers[items[0].storage_path] : undefined;
              return (
                <li key={a.id}>
                  <Link href={`/us/albums/${a.id}`} className="block overflow-hidden rounded-3xl bg-paper shadow-soft transition active:scale-[0.98]">
                    <div className="aspect-square bg-rose-soft">
                      {cover && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="px-4 py-3">
                      <p className="truncate font-serif text-lg">{a.title}</p>
                      <p className="text-xs text-muted">{t.albums.photos(items.length)}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="mt-8"><Link href="/us" className="text-sm text-muted underline underline-offset-4">{t.common.back}</Link></p>
    </>
  );
}
