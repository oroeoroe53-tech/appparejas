"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ExperienceProps {
  text: string;
  senderName: string;
  dateLabel?: string;
  /** Start already opened (used for re-reading without the ceremony). */
  autoOpen?: boolean;
  /** Fires once the content is actually visible to the reader. Not called in previews. */
  onOpened?: () => void;
  /** Fires synchronously inside the reader's tap that starts the opening (a valid moment to start audio). */
  onOpenStart?: () => void;
  /** Signed link and length of a voice note or drawing. */
  media?: { url: string; seconds: number | null };
}

export const EASE = [0.22, 1, 0.36, 1] as const;

/** Open/close state + a one-shot `onOpened` that survives re-renders and cleans up its timers. */
export function useReveal({ autoOpen, onOpened, onOpenStart, deferNotify }: Pick<ExperienceProps, "autoOpen" | "onOpened" | "onOpenStart"> & { deferNotify?: boolean }) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState<"closed" | "opening" | "open">(autoOpen ? "open" : "closed");
  const timers = useRef<number[]>([]);
  const notified = useRef(false);
  const onOpenedRef = useRef(onOpened);
  const onOpenStartRef = useRef(onOpenStart);
  useEffect(() => {
    onOpenedRef.current = onOpened;
    onOpenStartRef.current = onOpenStart;
  }, [onOpened, onOpenStart]);

  const notify = useCallback(() => {
    if (notified.current) return;
    notified.current = true;
    onOpenedRef.current?.();
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((id) => window.clearTimeout(id));
  }, []);

  useEffect(() => {
    if (autoOpen && !deferNotify) notify();
  }, [autoOpen, deferNotify, notify]);

  const after = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const begin = useCallback(
    (duration: number) => {
      if (stage !== "closed") return;
      onOpenStartRef.current?.();
      if (reduce) {
        setStage("open");
        notify();
        return;
      }
      setStage("opening");
      after(duration, () => {
        setStage("open");
        notify();
      });
    },
    [stage, reduce, after, notify],
  );

  return { stage, begin, after, notify, reduce: Boolean(reduce) };
}

/** Wax seal carrying the brand mark. Doubles as the accessible "open" control when `onClick` is given. */
export function Seal({ onClick, label, size = 64, className, broken }: { onClick?: () => void; label?: string; size?: number; className?: string; broken?: boolean }) {
  const face = (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="wax" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#c05468" />
          <stop offset="0.6" stopColor="#9d394d" />
          <stop offset="1" stopColor="#6f2433" />
        </radialGradient>
      </defs>
      <path
        d="M32 3c6 0 8 4 13 5 6 1 10 5 10 11 0 5 5 8 5 13s-4 8-5 12c-1 6-6 10-12 11-5 1-8 5-13 5s-8-4-13-5c-6-1-10-6-11-12-1-5-5-7-5-12s5-8 5-13C6 13 11 9 18 8c5-1 8-5 14-5z"
        fill="url(#wax)"
      />
      <circle cx="32" cy="32" r="19" fill="none" stroke="#fffefc" strokeOpacity="0.28" strokeWidth="1.5" />
      <circle cx="27" cy="32" r="8.5" fill="none" stroke="#fffefc" strokeOpacity="0.85" strokeWidth="2" />
      <circle cx="37" cy="32" r="8.5" fill="none" stroke="#e9b8b8" strokeOpacity="0.9" strokeWidth="2" />
      {broken && <path d="M20 8l8 14-6 8 10 10-4 14" stroke="#2a0f16" strokeOpacity="0.55" strokeWidth="1.6" fill="none" strokeLinecap="round" />}
    </svg>
  );
  if (!onClick) return <span className={className}>{face}</span>;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94 }}
      className={cn("rounded-full drop-shadow-[0_6px_10px_rgb(111_36_51/0.45)]", className)}
    >
      {face}
    </motion.button>
  );
}

/** Splits the message into paragraphs, keeping the author's line breaks. */
export function paragraphs(text: string): string[] {
  return text.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
}

export function Reveal({ children, delay = 0, y = 10, className }: { children: React.ReactNode; delay?: number; y?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay, ease: EASE }} className={className}>
      {children}
    </motion.div>
  );
}
