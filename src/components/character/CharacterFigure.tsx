"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
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
}: {
  frames: CharacterFrames;
  label: string;
  className?: string;
  interactive?: boolean;
}) {
  const reduce = useReducedMotion();
  const [frame, setFrame] = useState<keyof CharacterFrames>("neutral");
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
