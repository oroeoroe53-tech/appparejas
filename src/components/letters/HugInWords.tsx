"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { t } from "@/content";
import { EASE, useReveal, type ExperienceProps } from "./shared";

/** Two arms draw around the words, and the words arrive one by one, like being held. */
export function HugInWords(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { notify, after, reduce } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  const words = text.split(/(\s+)/);

  // Count it as opened once the embrace has finished drawing.
  useEffect(() => {
    after(1800, notify);
  }, [after, notify]);

  let wordIndex = 0;
  return (
    <motion.article
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative overflow-hidden rounded-[2rem] px-8 pb-10 pt-14 text-center shadow-lift"
      style={{ background: "linear-gradient(165deg, #fbe6df 0%, #f6d3cf 55%, #efc1c2 100%)", color: "#382d2a" }}
      aria-label={t.types.hug_in_words.name}
    >
      <svg viewBox="0 0 300 380" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
        <motion.path
          d="M-6 150C18 142 38 190 38 255c0 50-16 88-44 118"
          fill="none"
          stroke="#9d394d"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: EASE, delay: 0.2 }}
        />
        <motion.path
          d="M306 150C282 142 262 190 262 255c0 50 16 88 44 118"
          fill="none"
          stroke="#9d394d"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: EASE, delay: 0.2 }}
        />
      </svg>
      <motion.span
        aria-hidden="true"
        className="absolute left-1/2 top-6 h-2 w-2 -translate-x-1/2 rounded-full bg-[#9d394d]"
        animate={reduce ? undefined : { scale: [1, 1.9, 1], opacity: [0.9, 0.4, 0.9] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <p className="relative whitespace-pre-wrap break-words font-serif text-[1.3rem] leading-[1.7]">
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return w;
          const delay = 0.6 + Math.min(wordIndex++, 60) * 0.05;
          return (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: reduce ? 0 : delay }}>
              {w}
            </motion.span>
          );
        })}
      </p>
      <p className="relative mt-8 text-xs tracking-[0.18em] text-[#7f2c3e] uppercase">{t.experience.from(senderName)}</p>
      {dateLabel && <p className="relative mt-1 text-xs text-[#7f2c3e]/80">{dateLabel}</p>}
    </motion.article>
  );
}
