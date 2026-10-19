"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/content";

/** An image that opens full screen when tapped (Escape or the close button brings you back). */
export function FullscreenImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    const trigger = opener.current;
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" onClick={() => setOpen(true)} aria-label={`${alt}. ${t.albums.openFull}`} className="block w-full cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3" onClick={() => setOpen(false)}>
          <button ref={closeBtn} type="button" onClick={() => setOpen(false)} aria-label={t.albums.closeViewer} className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white"><X className="h-5 w-5" aria-hidden /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-lg bg-[#fffdf8] object-contain" />
        </div>
      )}
    </>
  );
}
