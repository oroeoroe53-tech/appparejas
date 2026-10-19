"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { t } from "@/content";
import { compressImage, discardUpload, uploadMedia } from "@/lib/media-client";

/** Optional photo for a story moment. Uploads right away and hands the path to the form as a hidden field. */
export function StoryPhotoField({ spaceId }: { spaceId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    try {
      const blob = await compressImage(file);
      const uploaded = await uploadMedia(spaceId, "story", blob, "jpg", "image/jpeg");
      if (path) void discardUpload(path);
      setPath(uploaded);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError(t.media.errors.upload);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function remove() {
    if (path) void discardUpload(path);
    setPath("");
    setPreview(null);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="photoPath" value={path} />
      <input ref={input} type="file" accept="image/*" className="sr-only" id="story-photo" onChange={(e) => void pick(e.target.files?.[0])} />
      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-28 w-28 rounded-2xl object-cover" />
          <button type="button" onClick={remove} aria-label={t.storyPhoto.remove} className="absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full bg-ink text-cream"><X className="h-4 w-4" aria-hidden /></button>
        </div>
      ) : (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm">
          <ImagePlus className="h-4 w-4" aria-hidden /> {busy ? t.storyPhoto.uploading : t.storyPhoto.add}
        </button>
      )}
      {error && <p role="alert" className="text-sm text-cherry">{error}</p>}
    </div>
  );
}
