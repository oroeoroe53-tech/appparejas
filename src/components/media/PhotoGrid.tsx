"use client";

import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deletePhotoAction } from "@/app/actions/media";
import { t } from "@/content";
import { formatDay } from "@/lib/utils";

export interface GridPhoto {
  id: string;
  url: string;
  caption: string | null;
  takenOn: string | null;
  mine: boolean;
}

/** Thumbnails that open into a full-screen viewer with keyboard and swipe-free arrows. */
export function PhotoGrid({ photos }: { photos: GridPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(null);
    setConfirm(false);
    opener.current?.focus();
  }, []);
  const go = useCallback((delta: number) => {
    setConfirm(false);
    setOpen((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (open === null) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close, go]);

  const current = open === null ? null : photos[open];
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={(e) => { opener.current = e.currentTarget; setOpen(i); }}
              aria-label={p.caption ?? t.albums.photoOf(i + 1, photos.length)}
              className="block aspect-square w-full overflow-hidden rounded-xl bg-rose-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {current && open !== null && (
        <div role="dialog" aria-modal="true" aria-label={t.albums.photoOf(open + 1, photos.length)} className="fixed inset-0 z-50 flex flex-col bg-black/92 text-white">
          <div className="flex items-center justify-between p-4">
            <p className="text-sm text-white/70">{t.albums.photoOf(open + 1, photos.length)}</p>
            <button ref={closeBtn} type="button" onClick={close} aria-label={t.albums.closeViewer} className="grid h-11 w-11 place-items-center rounded-full bg-white/10"><X className="h-5 w-5" aria-hidden /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.caption ?? ""} className="max-h-full max-w-full rounded-lg object-contain" />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label={t.albums.previous} className="absolute left-2 grid h-11 w-11 place-items-center rounded-full bg-white/15"><ChevronLeft className="h-6 w-6" aria-hidden /></button>
                <button type="button" onClick={() => go(1)} aria-label={t.albums.next} className="absolute right-2 grid h-11 w-11 place-items-center rounded-full bg-white/15"><ChevronRight className="h-6 w-6" aria-hidden /></button>
              </>
            )}
          </div>
          <div className="safe-bottom flex items-center justify-between gap-3 p-4">
            <div className="min-w-0 text-sm">
              {current.caption && <p className="truncate">{current.caption}</p>}
              {current.takenOn && <p className="text-white/60">{formatDay(current.takenOn)}</p>}
            </div>
            {current.mine && (
              confirm ? (
                <span className="flex items-center gap-2 text-sm">
                  <button type="button" disabled={pending} onClick={() => start(async () => { await deletePhotoAction(current.id); close(); })} className="rounded-full bg-cherry px-4 py-2">{t.albums.deletePhoto}</button>
                  <button type="button" onClick={() => setConfirm(false)} className="rounded-full bg-white/15 px-4 py-2">{t.common.cancel}</button>
                </span>
              ) : (
                <button type="button" onClick={() => setConfirm(true)} aria-label={t.albums.deletePhoto} className="grid h-11 w-11 place-items-center rounded-full bg-white/10"><Trash2 className="h-5 w-5" aria-hidden /></button>
              )
            )}
          </div>
        </div>
      )}
    </>
  );
}
