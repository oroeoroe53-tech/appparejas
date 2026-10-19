"use client";

import { Music2, Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { clampClip, formatClock, SONG_MIN_CLIP, SONG_PREVIEW_SECONDS, type SongClip, type SongResult } from "@/lib/songs";
import { cn } from "@/lib/utils";
import { SongPlayer, type SongPlayerHandle } from "./SongPlayer";

const LENGTHS = [5, 10, 15, 20, 30];

/** Optional "add a song" block for the composer: search, pick a track, choose which part plays. */
export function SongPicker({ value, onChange, simple = false, title, hint }: { value: SongClip | null; onChange: (song: SongClip | null) => void; simple?: boolean; title?: string; hint?: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SongResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [auditioning, setAuditioning] = useState<string | null>(null);
  const audition = useRef<HTMLAudioElement>(null);
  const player = useRef<SongPlayerHandle>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2 || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const res = await fetch(`/api/songs/search?q=${encodeURIComponent(q)}`, { credentials: "same-origin" });
      if (res.status === 429) setError(t.song.errors.limited);
      else if (!res.ok) setError(t.song.errors.search);
      else setResults(((await res.json()) as { results: SongResult[] }).results);
    } catch {
      setError(t.song.errors.search);
    }
    setBusy(false);
  }

  function toggleAudition(result: SongResult) {
    const a = audition.current;
    if (!a) return;
    if (auditioning === result.trackId) {
      a.pause();
      setAuditioning(null);
      return;
    }
    a.src = result.previewUrl;
    a.play().then(() => setAuditioning(result.trackId)).catch(() => setAuditioning(null));
  }

  function choose(result: SongResult) {
    audition.current?.pause();
    setAuditioning(null);
    onChange({ ...result, ...clampClip(0, 15) });
    setOpen(false);
  }

  function setClip(start: number, duration: number) {
    if (value) onChange({ ...value, ...clampClip(start, duration) });
  }

  return (
    <section className="mt-6" aria-label={t.song.sectionTitle}>
      <audio ref={audition} onEnded={() => setAuditioning(null)} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg">{title ?? t.song.sectionTitle}</h3>
          <p className="text-[13px] text-muted">{hint ?? t.song.optional}</p>
        </div>
        {!value && !open && (
          <Button variant="secondary" className="min-h-11 px-4" onClick={() => setOpen(true)}>
            <Music2 className="h-4 w-4" aria-hidden /> {t.song.add}
          </Button>
        )}
      </div>

      {value && (
        <div className="mt-4 space-y-4">
          <SongPlayer ref={player} clip={value} />
          <div className={cn("rounded-2xl border border-line p-4", simple && "hidden")}>
            <p className="text-sm font-medium">{t.song.partTitle}</p>
            <label htmlFor="clip-start" className="mt-3 block text-[13px] text-muted">
              {t.song.startsAt(formatClock(value.start))}
            </label>
            <input
              id="clip-start"
              type="range"
              min={0}
              max={Math.min(29, SONG_PREVIEW_SECONDS - value.duration)}
              step={1}
              value={value.start}
              onChange={(e) => setClip(Number(e.target.value), value.duration)}
              className="mt-1 w-full accent-[var(--c-cherry)]"
            />
            <p className="mt-3 text-[13px] text-muted" id="clip-length-label">{t.song.length}</p>
            <div role="radiogroup" aria-labelledby="clip-length-label" className="mt-1.5 flex flex-wrap gap-2">
              {LENGTHS.filter((l) => l >= SONG_MIN_CLIP).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={value.duration === l}
                  onClick={() => setClip(value.start, l)}
                  className={cn("min-h-10 rounded-full border px-4 text-sm transition", value.duration === l ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper hover:border-stone")}
                >
                  {t.song.seconds(l)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-muted" aria-live="polite">{t.song.plays(formatClock(value.start), formatClock(value.start + value.duration))}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="min-h-10 px-4" onClick={() => setOpen(true)}>{t.song.change}</Button>
            <Button variant="ghost" className="min-h-10 px-4" onClick={() => { onChange(null); setOpen(false); }}>
              <X className="h-4 w-4" aria-hidden /> {t.song.remove}
            </Button>
          </div>
        </div>
      )}

      {open && (
        <div className="mt-4 rounded-2xl border border-line p-4">
          <form onSubmit={search} role="search" className="flex gap-2">
            <label htmlFor="song-q" className="sr-only">{t.song.searchLabel}</label>
            <input
              id="song-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.song.searchPlaceholder}
              maxLength={80}
              autoComplete="off"
              className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-paper px-4 text-base placeholder:text-stone focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25"
            />
            <Button type="submit" className="min-h-11 px-4" disabled={busy || query.trim().length < 2} aria-busy={busy}>
              {busy ? <Spinner /> : <Search className="h-4 w-4" aria-hidden />}
              <span className="sr-only">{busy ? t.song.searching : t.song.search}</span>
            </Button>
          </form>
          <p className="mt-2 text-[12px] text-muted">{t.song.previewNote}</p>
          {error && <p role="alert" className="mt-3 text-sm text-cherry">{error}</p>}
          {results && results.length === 0 && !error && <p className="mt-3 text-sm text-muted">{t.song.noResults}</p>}
          {results && results.length > 0 && (
            <ul className="mt-3 space-y-2">
              {results.map((r) => (
                <li key={r.trackId} className="flex items-center gap-3 rounded-xl bg-paper p-2 pr-3">
                  <button type="button" onClick={() => toggleAudition(r)} aria-label={`${auditioning === r.trackId ? t.song.pause : t.song.play}: ${r.title}`} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-rose-soft">
                    {r.artworkUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.artworkUrl} alt="" width={48} height={48} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-black/35 text-white text-sm">{auditioning === r.trackId ? "❚❚" : "▶"}</span>
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{r.title}</span>
                    <span className="block truncate text-sm text-muted">{r.artist}</span>
                  </span>
                  <Button variant="secondary" className="min-h-10 px-4" onClick={() => choose(r)}>{t.song.choose}</Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted">{t.song.attribution}</p>
          <Button variant="ghost" className="mt-2 min-h-10 px-3" onClick={() => { audition.current?.pause(); setAuditioning(null); setOpen(false); }}>{t.common.cancel}</Button>
        </div>
      )}
    </section>
  );
}
