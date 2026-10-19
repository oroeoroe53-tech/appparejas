"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { brand } from "@/config/brand";
import { t } from "@/content";
import { cn } from "@/lib/utils";

function Rings() {
  return (
    <svg viewBox="0 0 220 140" className="w-56" fill="none" aria-hidden="true">
      <motion.circle cx="85" cy="70" r="52" stroke="var(--c-cherry)" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, ease: "easeInOut" }} />
      <motion.circle cx="135" cy="70" r="52" stroke="var(--c-rose)" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }} />
    </svg>
  );
}

function Fan() {
  const cards = [
    { r: -12, x: -64, bg: "#f7e6e3", label: "♡" },
    { r: 0, x: 0, bg: "#fffefc", label: "—" },
    { r: 12, x: 64, bg: "#e9b8b8", label: "·" },
  ];
  return (
    <div className="relative h-36 w-56" aria-hidden="true">
      {cards.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 24, rotate: 0, x: 0 }}
          animate={{ opacity: 1, y: 0, rotate: c.r, x: c.x }}
          transition={{ delay: 0.15 * i, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-1/2 top-2 h-28 w-20 -translate-x-1/2 rounded-md shadow-soft"
          style={{ background: c.bg }}
        >
          <div className="mx-3 mt-4 space-y-1.5 opacity-40">
            <div className="h-1 rounded-full bg-ink" />
            <div className="h-1 w-3/4 rounded-full bg-ink" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function Nudge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-72 rounded-2xl border border-line bg-paper/90 p-4 text-left shadow-lift backdrop-blur"
      aria-hidden="true"
    >
      <div className="flex items-center gap-2 text-[11px] tracking-wider text-muted uppercase">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-cherry text-[9px] text-on-cherry">{brand.shortName}</span>
        {brand.name} · now
      </div>
      <p className="mt-2 text-[15px]">{t.types.little_note.notification}</p>
    </motion.div>
  );
}

const visuals = [Rings, Fan, Nudge];

export function Onboarding() {
  const [index, setIndex] = useState(0);
  const slides = t.onboarding.slides;
  const slide = slides[index]!;
  const Visual = visuals[index]!;
  const last = index === slides.length - 1;

  return (
    <main id="main" className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <Link href="/login" className="text-sm text-muted underline-offset-4 hover:underline">{t.onboarding.haveAccount}</Link>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }} className="flex flex-col items-center">
            <div className="mb-10 flex h-40 items-center justify-center">
              <Visual />
            </div>
            <p className="text-xs tracking-[0.22em] text-cherry uppercase">{slide.eyebrow}</p>
            <h1 className="mt-3 max-w-[18ch] font-serif text-[2.1rem] leading-[1.15] tracking-tight">{slide.title}</h1>
            <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-muted">{slide.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-5">
        <div className="flex justify-center gap-2" role="img" aria-label={t.onboarding.progress(index + 1, slides.length)}>
          {slides.map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-cherry" : "w-1.5 bg-stone/50")} />
          ))}
        </div>
        {last ? (
          <ButtonLink href="/register" className="w-full">{t.onboarding.start}</ButtonLink>
        ) : (
          <Button className="w-full" onClick={() => setIndex(index + 1)}>{t.onboarding.next}</Button>
        )}
      </div>
    </main>
  );
}
