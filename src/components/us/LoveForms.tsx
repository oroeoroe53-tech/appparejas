"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { addDreamAction, addPlaylistSongAction, giveCouponAction, redeemCouponAction, toggleDreamAction } from "@/app/actions/love";
import { SongPicker } from "@/components/songs/SongPicker";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";
import type { SongClip } from "@/lib/songs";
import { cn } from "@/lib/utils";

function Area({ name, label, rows = 2, maxLength }: { name: string; label: string; rows?: number; maxLength: number }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">{label}</label>
      <textarea id={name} name={name} rows={rows} maxLength={maxLength} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
    </div>
  );
}

export function DreamForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof addDreamAction>[0], fd: FormData) => {
    const res = await addDreamAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.dreams.add}</h2>
      <Field label={t.dreams.titleLabel} name="title" maxLength={120} placeholder={t.dreams.titlePlaceholder} required />
      <Field label={t.dreams.dateLabel} name="date" type="date" min="1950-01-01" max="2100-12-31" />
      <Area name="note" label={t.dreams.noteLabel} maxLength={500} />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.dreams.saving} className="w-full">{t.dreams.saveCta}</SubmitButton>
    </form>
  );
}

/** A checkbox that responds instantly and is corrected if the server says no. */
export function DreamCheck({ id, title, done: initial }: { id: string; title: string; done: boolean }) {
  const [done, setDone] = useState(initial);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? t.dreams.markTodo(title) : t.dreams.markDone(title)}
      onClick={() => {
        const next = !done;
        setDone(next);
        start(async () => {
          const res = await toggleDreamAction(id, next);
          if (!res.ok) setDone(!next);
        });
      }}
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition active:scale-90", done ? "border-cherry bg-cherry text-on-cherry" : "border-stone")}
    >
      {done && <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
    </button>
  );
}

export function CouponForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof giveCouponAction>[0], fd: FormData) => {
    const res = await giveCouponAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.coupons.give}</h2>
      <Field label={t.coupons.titleLabel} name="title" maxLength={80} placeholder={t.coupons.titlePlaceholder} required />
      <Area name="description" label={t.coupons.descLabel} maxLength={300} />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.coupons.giving} className="w-full">{t.coupons.giveCta}</SubmitButton>
    </form>
  );
}

export function UseCouponButton({ id }: { id: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  if (!asking) return <Button className="min-h-11 px-5" onClick={() => setAsking(true)}>{t.coupons.use}</Button>;
  return (
    <div role="alertdialog" aria-label={t.coupons.confirmUse} className="flex flex-wrap items-center gap-2 text-sm">
      <span>{t.coupons.confirmUse}</span>
      <Button className="min-h-10 px-4" disabled={pending} onClick={() => start(async () => { const r = await redeemCouponAction(id); if (!r.ok) { setError(t.coupons.errors.generic); setAsking(false); } })}>{pending ? t.coupons.using : t.coupons.confirmYes}</Button>
      <Button variant="ghost" className="min-h-10 px-3" onClick={() => setAsking(false)}>{t.common.cancel}</Button>
      {error && <span role="alert" className="text-cherry">{error}</span>}
    </div>
  );
}

export function PlaylistAdd() {
  const [song, setSong] = useState<SongClip | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ error?: string; notice?: string }>();
  const [pending, start] = useTransition();
  return (
    <div className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft">
      <h2 className="font-serif text-xl">{t.playlist.add}</h2>
      <SongPicker value={song} onChange={(s) => { setSong(s); setResult(undefined); }} simple title={t.playlist.add} hint="" />
      {song && (
        <>
          <Field label={t.playlist.noteLabel} value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} />
          <FormMessage error={result?.error} notice={result?.notice} />
          <Button
            className="w-full"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await addPlaylistSongAction({ trackId: song.trackId, note });
                if (res.ok) {
                  setSong(null);
                  setNote("");
                  setResult({ notice: t.common.saved });
                } else setResult({ error: res.error });
              })
            }
          >
            {pending ? t.playlist.saving : t.playlist.saveCta}
          </Button>
        </>
      )}
    </div>
  );
}
