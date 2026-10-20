"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { nameForPoint, searchPlaces, type Place } from "@/lib/places";
import { LeafletMap } from "./LeafletMap";

/** Choose where a photo was taken: search for a place, or tap the map for the exact spot. */
export function PlacePicker({
  initial,
  onSave,
  onClose,
}: {
  initial: Place | null;
  onSave: (place: Place) => Promise<boolean>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Place | null>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const lookup = useRef<AbortController | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (busy || query.trim().length < 2) return;
    setBusy(true);
    setError(undefined);
    try {
      setResults(await searchPlaces(query));
    } catch {
      setError(t.albums.place.noResults);
      setResults([]);
    }
    setBusy(false);
  }

  async function tapMap(point: { lat: number; lng: number }) {
    setPicked({ ...point, name: picked?.name ?? "" });
    lookup.current?.abort();
    const ctl = new AbortController();
    lookup.current = ctl;
    const name = await nameForPoint(point, ctl.signal);
    if (!ctl.signal.aborted) setPicked({ ...point, name });
  }

  async function save() {
    if (!picked || saving) return;
    setSaving(true);
    setError(undefined);
    const ok = await onSave(picked);
    setSaving(false);
    if (!ok) setError(t.albums.place.error);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t.albums.place.title} className="fixed inset-0 z-[60] flex flex-col bg-cream text-ink">
      <div className="flex items-center justify-between p-4">
        <h2 className="font-serif text-xl">{t.albums.place.title}</h2>
        <button ref={closeBtn} type="button" onClick={onClose} aria-label={t.albums.map.close} className="grid h-11 w-11 place-items-center rounded-full bg-rose-soft"><X className="h-5 w-5" aria-hidden /></button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
        <form onSubmit={search} className="flex gap-2">
          <label htmlFor="place-q" className="sr-only">{t.albums.place.searchLabel}</label>
          <input id="place-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.albums.place.searchPlaceholder} maxLength={80} className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-paper px-4 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
          <button type="submit" disabled={busy} aria-label={t.albums.place.search} className="grid h-12 w-12 place-items-center rounded-full bg-cherry text-on-cherry disabled:opacity-60">
            {busy ? <Spinner className="h-5 w-5" /> : <Search className="h-5 w-5" aria-hidden />}
          </button>
        </form>
        {results && (
          <ul className="max-h-40 space-y-1 overflow-y-auto" aria-label={t.albums.place.searchLabel}>
            {results.length === 0 && <li className="text-sm text-muted">{t.albums.place.noResults}</li>}
            {results.map((r) => (
              <li key={`${r.lat},${r.lng}`}>
                <button type="button" onClick={() => { setPicked(r); setResults(null); }} className="w-full rounded-xl bg-paper px-4 py-3 text-left text-sm shadow-soft">{r.name}</button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">{t.albums.place.tapMap}</p>
        <LeafletMap label={t.albums.place.mapLabel} className="min-h-0 flex-1" picked={picked} onPick={(p) => void tapMap(p)} center={initial ?? undefined} zoom={initial ? 12 : 2} />
        {picked && <p className="text-sm">{picked.name || t.albums.place.unnamed}</p>}
        {error && <p role="alert" className="text-sm text-cherry">{error}</p>}
        <button type="button" onClick={save} disabled={!picked || saving} aria-busy={saving} className="safe-bottom inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 font-medium text-on-cherry shadow-soft transition active:scale-[0.98] disabled:opacity-50">
          {saving ? (<><Spinner /> {t.albums.place.saving}</>) : t.albums.place.save}
        </button>
      </div>
    </div>
  );
}
