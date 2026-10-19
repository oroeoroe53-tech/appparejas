"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { openOpenWhenAction, writeOpenWhenAction } from "@/app/actions/gestures";
import { MessageExperience } from "@/components/letters/MessageExperience";
import { TypeGlyph } from "@/components/letters/TypeGlyph";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";
import { isLetterStyle, LETTER_STYLES, type MessageType } from "@/lib/message-types";
import { cn } from "@/lib/utils";

const STYLES = LETTER_STYLES.filter((s) => s !== "quick");

/** A letter addressed to you for a certain moment. Sealed until you open it. */
export function OpenWhenCard({ id, label, style, content: initial, senderName, openedLabel }: { id: string; label: string; style: MessageType; content: string | null; senderName: string; openedLabel: string | null }) {
  const [content, setContent] = useState<string | null>(initial);
  const [shownStyle, setShownStyle] = useState<MessageType>(style);
  const [showing, setShowing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function open() {
    setError(undefined);
    start(async () => {
      const res = await openOpenWhenAction(id);
      if (res.ok) {
        setContent(res.content);
        if (isLetterStyle(res.style)) setShownStyle(res.style);
        setShowing(true);
      } else setError(res.error);
    });
  }

  return (
    <li className="rounded-3xl bg-paper p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-rose-soft"><TypeGlyph type={shownStyle} size={44} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-lg leading-snug">{t.openWhen.openWhenLabel(label)}</p>
          <p className="text-xs text-muted">{openedLabel ?? t.openWhen.waiting}</p>
        </div>
      </div>
      {!showing && (
        <div className="mt-4">
          {content === null ? (
            <Button className="w-full" onClick={open} disabled={pending} aria-busy={pending}>{pending ? t.openWhen.opening : t.openWhen.open}</Button>
          ) : (
            <Button variant="secondary" className="w-full" onClick={() => setShowing(true)}>{t.openWhen.readAgain}</Button>
          )}
          {error && <p role="alert" className="mt-2 text-sm text-cherry">{error}</p>}
        </div>
      )}
      {showing && content !== null && (
        <div className="mt-4">
          <MessageExperience type={shownStyle} text={content} senderName={senderName} />
          <Button variant="ghost" className="mt-2 min-h-10 px-4" onClick={() => setShowing(false)}>{t.common.close}</Button>
        </div>
      )}
    </li>
  );
}

export function OpenWhenForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const [style, setStyle] = useState<string>("love_letter");
  const [state, action] = useActionState(async (prev: Parameters<typeof writeOpenWhenAction>[0], fd: FormData) => {
    const res = await writeOpenWhenAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-3xl bg-paper p-5 shadow-soft" noValidate>
      <h2 className="font-serif text-xl">{t.openWhen.write}</h2>
      <Field ref={labelRef} label={t.openWhen.labelLabel} name="label" maxLength={60} placeholder={t.openWhen.labelPlaceholder} required />
      <div className="flex flex-wrap gap-2" aria-label={t.openWhen.labelLabel}>
        {t.openWhen.presets.map((p) => (
          <button key={p} type="button" onClick={() => { if (labelRef.current) { labelRef.current.value = p; labelRef.current.focus(); } }} className="min-h-9 rounded-full border border-line px-3 text-xs text-muted hover:text-ink">{p}</button>
        ))}
      </div>
      <div role="radiogroup" aria-label={t.openWhen.styleLabel} className="grid grid-cols-3 gap-2">
        {STYLES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={style === s} onClick={() => setStyle(s)} className={cn("flex flex-col items-center gap-1 rounded-2xl border p-2 text-[11px] transition", style === s ? "border-cherry bg-rose-soft" : "border-line")}>
            <TypeGlyph type={s} size={36} />
            {t.types[s].name}
          </button>
        ))}
      </div>
      <input type="hidden" name="style" value={style} />
      <div className="space-y-1.5">
        <label htmlFor="ow-text" className="block text-sm font-medium">{t.openWhen.textLabel}</label>
        <textarea id="ow-text" name="content" rows={6} maxLength={3000} placeholder={t.openWhen.textPlaceholder} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base placeholder:text-stone focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
      </div>
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.openWhen.saving} className="w-full">{t.openWhen.saveCta}</SubmitButton>
    </form>
  );
}
