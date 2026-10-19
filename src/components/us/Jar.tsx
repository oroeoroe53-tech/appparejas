"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useActionState, useRef, useState } from "react";
import { addReasonAction } from "@/app/actions/gestures";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

const SLIPS = [
  { x: 54, y: 78, r: -18, c: "#f9d5dc" },
  { x: 90, y: 70, r: 12, c: "#fbeed3" },
  { x: 72, y: 96, r: -6, c: "#e8d9f1" },
  { x: 108, y: 92, r: 20, c: "#dff0d8" },
  { x: 46, y: 108, r: 9, c: "#f3d9c6" },
  { x: 86, y: 116, r: -14, c: "#f9d5dc" },
];

function JarArt({ filled }: { filled: number }) {
  return (
    <svg viewBox="0 0 160 170" className="mx-auto w-44" fill="none" aria-hidden="true">
      <rect x="44" y="14" width="72" height="16" rx="5" fill="var(--c-cherry)" />
      <path d="M40 38c0-5 4-8 9-8h62c5 0 9 3 9 8v14c14 8 20 22 20 38v44c0 17-12 28-28 28H48c-16 0-28-11-28-28V90c0-16 6-30 20-38V38z" fill="var(--c-paper)" stroke="var(--c-rose)" strokeWidth="3" />
      {SLIPS.slice(0, Math.min(SLIPS.length, Math.max(1, filled))).map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width="26" height="16" rx="2" fill={s.c} transform={`rotate(${s.r} ${s.x + 13} ${s.y + 8})`} />
      ))}
      <path d="M32 72c-6 8-8 16-8 26" stroke="var(--c-rose)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

/** Pull a slip out of the jar: a folded paper unfolds with one of the reasons. */
export function PullReason({ reasons, partnerName }: { reasons: string[]; partnerName: string }) {
  const [current, setCurrent] = useState<{ text: string; n: number } | null>(null);
  const last = useRef(-1);

  function pull() {
    if (reasons.length === 0) return;
    let i = Math.floor(Math.random() * reasons.length);
    if (reasons.length > 1 && i === last.current) i = (i + 1) % reasons.length;
    last.current = i;
    setCurrent({ text: reasons[i] as string, n: (current?.n ?? 0) + 1 });
  }

  return (
    <div className="rounded-[2rem] bg-paper px-6 py-8 text-center shadow-soft">
      <JarArt filled={reasons.length} />
      {reasons.length === 0 ? (
        <p className="mx-auto mt-4 max-w-[28ch] text-[15px] text-muted">{t.jar.emptyJar(partnerName)}</p>
      ) : (
        <>
          <div className="mt-5 min-h-[7rem]" aria-live="polite">
            <AnimatePresence mode="wait">
              {current && (
                <motion.div
                  key={current.n}
                  initial={{ opacity: 0, y: 18, rotateX: -70, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformPerspective: 600 }}
                  className="paper mx-auto max-w-[300px] rounded-md px-5 py-4 shadow-lift"
                >
                  <p className="text-[11px] tracking-[0.18em] text-[#8a6d66] uppercase">{t.jar.fromThem(partnerName)}</p>
                  <p className="mt-2 font-serif text-[1.2rem] italic leading-snug">{current.text}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Button className="mt-4" onClick={pull}>{current ? t.jar.pullAgain : t.jar.pull}</Button>
        </>
      )}
    </div>
  );
}

export function ReasonForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(async (prev: Parameters<typeof addReasonAction>[0], fd: FormData) => {
    const res = await addReasonAction(prev, fd);
    if (res?.notice) formRef.current?.reset();
    return res;
  }, undefined);
  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-3xl border border-line p-5" noValidate>
      <h2 className="font-serif text-xl">{t.jar.add}</h2>
      <label htmlFor="reason" className="block text-sm font-medium">{t.jar.label}</label>
      <textarea id="reason" name="content" rows={2} maxLength={200} placeholder={t.jar.placeholder} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base placeholder:text-stone focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.jar.adding} className="w-full">{t.jar.addCta}</SubmitButton>
    </form>
  );
}
