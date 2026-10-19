"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { t } from "@/content";
import { EASE, useReveal, type ExperienceProps } from "./shared";

/** A wordless hello: rings of warmth spreading from a small heart. */
export function ThinkingOfYou(props: ExperienceProps) {
  const { senderName, dateLabel } = props;
  const { notify, after, reduce } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  // Counted as read once it has been on screen for a moment.
  useEffect(() => after(1000, notify), [after, notify]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-col items-center py-10 text-center">
      <div className="relative grid h-40 w-40 place-items-center" aria-hidden="true">
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute h-24 w-24 rounded-full border border-cherry/40"
              initial={{ scale: 0.6, opacity: 0.7 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 1, ease: "easeOut" }}
            />
          ))}
        <svg viewBox="0 0 100 96" className="animate-heartbeat relative w-16 drop-shadow-[0_8px_14px_rgb(157_57_77/0.35)]">
          <path d="M50 88C18 62 6 44 6 29 6 16 16 8 28 8c9 0 17 5 22 13C55 13 63 8 72 8c12 0 22 8 22 21 0 15-12 33-44 59z" fill="var(--c-cherry)" />
        </svg>
      </div>
      <p className="mt-6 font-serif text-2xl">{t.ping.received(senderName)}</p>
      {dateLabel && <p className="mt-2 text-sm text-muted">{dateLabel}</p>}
    </motion.div>
  );
}
