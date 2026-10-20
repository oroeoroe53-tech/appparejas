"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setHomeBackgroundAction } from "@/app/actions/settings";
import { FormMessage } from "@/components/ui/Notice";
import { t } from "@/content";
import { cn } from "@/lib/utils";

export interface PickerPhoto {
  id: string;
  path: string;
  url: string;
  caption: string | null;
}

/** Choose between the default look of the home screen and one of your couple's photos. */
export function BackgroundPicker({ photos, currentPath }: { photos: PickerPhoto[]; currentPath: string | null }) {
  const [path, setPath] = useState(currentPath);
  const [result, setResult] = useState<{ error?: string; notice?: string }>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const b = t.settings.background;

  function choose(photo: PickerPhoto | null) {
    if (pending) return;
    const previous = path;
    setPath(photo?.path ?? null);
    setResult(undefined);
    start(async () => {
      const res = await setHomeBackgroundAction(photo?.id ?? null);
      if (res.ok) {
        setResult({ notice: b.saved });
        router.refresh();
      } else {
        setPath(previous);
        setResult({ error: b.error });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div role="radiogroup" aria-label={b.title} className="grid gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={path === null}
          onClick={() => choose(null)}
          className={cn("rounded-2xl border px-4 py-3 text-left transition", path === null ? "border-cherry bg-rose-soft" : "border-line bg-paper")}
        >
          <span className="block font-medium">{b.asIs}</span>
          <span className="block text-sm text-muted">{b.asIsHint}</span>
        </button>
        <div className={cn("rounded-2xl border px-4 py-3", path !== null ? "border-cherry bg-rose-soft" : "border-line bg-paper")}>
          <span className="block font-medium">{b.photo}</span>
          <span className="block text-sm text-muted">{b.photoHint}</span>
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-[15px] text-muted">{b.none}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {photos.map((p, i) => {
            const on = p.path === path;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={p.caption ?? b.choose(i + 1, photos.length)}
                  onClick={() => choose(p)}
                  className={cn("relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-rose-soft transition active:scale-95", on && "ring-[3px] ring-cherry")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {on && (
                    <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-cherry text-on-cherry" aria-hidden>
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <FormMessage error={result?.error} notice={result?.notice} />
    </div>
  );
}
