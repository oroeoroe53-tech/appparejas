"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/content";
import type { CharacterFrames } from "@/lib/character";
import { cn } from "@/lib/utils";

/** An illustrated person that breathes, blinks, and smiles with a few hearts when you tap them. */
export function CharacterFigure({
  frames,
  label,
  className,
  interactive = true,
  envelope,
  envelopeHref,
}: {
  frames: CharacterFrames;
  label: string;
  className?: string;
  interactive?: boolean;
  /** When set, a message is waiting: they perk up and hold up an envelope. The text is read out to screen readers. */
  envelope?: string;
  /** Where tapping the envelope goes (your letters). */
  envelopeHref?: string;
}) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState<keyof CharacterFrames>(envelope ? "joy" : "neutral");
  const [hearts, setHearts] = useState<number[]>([]);
  const timers = useRef<number[]>([]);
  const joyUntil = useRef(0);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  // A waiting message makes them light up for a moment.
  useEffect(() => {
    if (!envelope) return;
    joyUntil.current = Date.now() + 2200;
    const id = window.setTimeout(() => setFrame("neutral"), 2200);
    return () => window.clearTimeout(id);
  }, [envelope]);

  // Blink every few seconds, unless the person asked for less motion.
  useEffect(() => {
    if (reduce) return;
    let cancelled = false;
    const loop = () => {
      const id = window.setTimeout(() => {
        if (cancelled) return;
        if (Date.now() > joyUntil.current) {
          setFrame("blink");
          later(150, () => setFrame((f) => (f === "blink" ? "neutral" : f)));
        }
        loop();
      }, 2800 + Math.random() * 3800);
      timers.current.push(id);
    };
    loop();
    return () => {
      cancelled = true;
    };
  }, [reduce, later]);

  function poke() {
    joyUntil.current = Date.now() + 1500;
    setFrame("joy");
    later(1500, () => setFrame("neutral"));
    const batch = Array.from({ length: 3 }, (_, i) => Date.now() + i);
    setHearts((h) => [...h, ...batch]);
    later(1800, () => setHearts((h) => h.filter((x) => !batch.includes(x))));
    if ("vibrate" in navigator) navigator.vibrate(12);
  }

  const face = (
    <div
      role="img"
      aria-label={label}
      className="h-full w-full overflow-hidden rounded-full bg-paper shadow-lift ring-4 ring-paper [&>svg]:h-full [&>svg]:w-full"
      // Safe: the markup comes from our own renderer, fed only catalogue-validated values.
      dangerouslySetInnerHTML={{ __html: frames[frame] }}
    />
  );

  return (
    <div className={cn("relative", className)}>
      <div className={cn("h-full w-full", !reduce && "animate-breathe")}>
        {interactive ? (
          <button type="button" onClick={poke} aria-label={`${label}. ${t.character.tapHint}`} className="h-full w-full rounded-full">
            {face}
          </button>
        ) : (
          face
        )}
      </div>
      {envelope && (
        <motion.div
          className="absolute -bottom-1 -right-3 w-[38%]"
          initial={reduce ? false : { y: 46, opacity: 0, rotate: -8 }}
          animate={reduce ? undefined : { y: 0, opacity: 1, rotate: [0, -6, 4, -3, 0] }}
          transition={{ y: { type: "spring", stiffness: 160, damping: 12, delay: 0.5 }, opacity: { delay: 0.5 }, rotate: { delay: 1, duration: 1.2, repeat: Infinity, repeatDelay: 2.5 } }}
        >
          {envelopeHref ? (
            <Link href={envelopeHref} aria-label={envelope} className="absolute inset-0 z-10 rounded-xl" />
          ) : (
            <span className="sr-only" role="status">{envelope}</span>
          )}
          <svg viewBox="0 0 64 48" aria-hidden="true" className="w-full drop-shadow-[0_6px_8px_rgb(0_0_0/0.18)]">
            <rect x="3" y="5" width="58" height="40" rx="6" fill="#fffdf8" stroke="#9d394d" strokeWidth="2.5" />
            <path d="M4 9l28 20 28-20" stroke="#9d394d" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
            <path d="M32 40c-9-6-12-10-12-14 0-3 2-5 5-5 3 0 5 2 7 4 2-2 4-4 7-4 3 0 5 2 5 5 0 4-3 8-12 14z" fill="#9d394d" transform="translate(0 -2) scale(1)" />
          </svg>
        </motion.div>
      )}
      <AnimatePresence>
        {hearts.map((id, i) => (
          <motion.span
            key={id}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-4 text-cherry"
            initial={{ opacity: 0, y: 0, x: (i - 1) * 8, scale: 0.6 }}
            animate={{ opacity: [0, 1, 0], y: -64 - i * 10, x: (i - 1) * 34, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <Heart className="h-5 w-5 fill-current" />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
