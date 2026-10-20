"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { t } from "@/content";
import { groupByPlace } from "@/lib/places";
import { formatDay } from "@/lib/utils";
import { LeafletMap, type MapPin } from "./LeafletMap";

export interface MapPhoto {
  id: string;
  albumId: string;
  url: string;
  caption: string | null;
  takenOn: string | null;
  lat: number;
  lng: number;
  place: string | null;
}

/** All your located photos on one map. Tap a pin to see what was taken there. */
export function PhotoMap({ photos }: { photos: MapPhoto[] }) {
  const groups = useMemo(() => groupByPlace(photos), [photos]);
  const pins = useMemo<MapPin[]>(() => groups.map((g) => ({ key: g.key, lat: g.lat, lng: g.lng, count: g.items.length, thumb: g.items[0]?.url })), [groups]);
  const [open, setOpen] = useState<string | null>(null);
  const group = groups.find((g) => g.key === open);

  return (
    <div className="relative">
      <LeafletMap pins={pins} onPinClick={setOpen} label={t.albums.map.label} className="h-[62dvh] min-h-[340px] w-full" />
      {group && (
        <section aria-label={group.items[0]?.place ?? t.albums.place.unnamed} className="absolute inset-x-2 bottom-2 z-[500] rounded-3xl bg-cream/95 p-4 shadow-lift backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-serif text-lg">{group.items.find((i) => i.place)?.place ?? t.albums.place.unnamed}</p>
              <p className="text-xs text-muted">{t.albums.map.here(group.items.length)}</p>
            </div>
            <button type="button" onClick={() => setOpen(null)} aria-label={t.albums.map.close} className="grid h-9 w-9 flex-none place-items-center rounded-full bg-rose-soft"><X className="h-4 w-4" aria-hidden /></button>
          </div>
          <ul className="scrollbar-none -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {group.items.map((p) => (
              <li key={p.id} className="flex-none">
                <Link href={`/us/albums/${p.albumId}`} aria-label={`${t.albums.map.openAlbum}${p.caption ? `: ${p.caption}` : ""}`} className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="h-24 w-24 rounded-2xl object-cover" />
                  {p.takenOn && <span className="mt-1 block text-center text-[11px] text-muted">{formatDay(p.takenOn)}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
