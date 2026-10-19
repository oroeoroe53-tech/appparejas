"use client";

import { ImagePlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addPhotoAction } from "@/app/actions/media";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { t } from "@/content";
import { compressImage, discardUpload, uploadMedia } from "@/lib/media-client";

const MAX_AT_ONCE = 12;

/** Picks photos, shrinks them on the device (removing location data), uploads, then records each one. */
export function PhotoUploader({ spaceId, albumId }: { spaceId: string; albumId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ error?: string; notice?: string }>();
  const router = useRouter();

  async function handle(files: FileList | null) {
    if (!files || files.length === 0 || progress) return;
    const list = Array.from(files).slice(0, MAX_AT_ONCE);
    setResult(undefined);
    setProgress({ done: 0, total: list.length });
    let ok = 0;
    let failed = false;
    for (const file of list) {
      try {
        const blob = await compressImage(file);
        const path = await uploadMedia(spaceId, "photos", blob, "jpg", "image/jpeg");
        const res = await addPhotoAction({ albumId, path });
        if (res.ok) ok += 1;
        else {
          failed = true;
          await discardUpload(path);
        }
      } catch (err) {
        failed = true;
        if (err instanceof Error && err.message === "not_image") setResult({ error: t.media.errors.notImage });
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }
    setProgress(null);
    if (input.current) input.current.value = "";
    setResult(failed && ok === 0 ? { error: t.media.errors.upload } : { notice: t.albums.uploaded(ok), error: failed ? t.media.errors.upload : undefined });
    router.refresh();
  }

  return (
    <div>
      <input ref={input} type="file" accept="image/*" multiple className="sr-only" id="photo-input" onChange={(e) => void handle(e.target.files)} />
      <Button className="w-full" disabled={progress !== null} onClick={() => input.current?.click()} aria-busy={progress !== null}>
        <ImagePlus className="h-5 w-5" aria-hidden /> {progress ? t.albums.uploading(progress.done, progress.total) : t.albums.addPhotos}
      </Button>
      <p className="mt-2 text-[12px] text-muted">{t.albums.note}</p>
      <FormMessage error={result?.error} notice={result?.notice} className="mt-3" />
    </div>
  );
}
