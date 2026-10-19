"use client";

import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/content";
import { EASE, Reveal, paragraphs, useReveal, type ExperienceProps } from "./shared";

const HEART_PATH = "M50 88C18 62 6 44 6 29 6 16 16 8 28 8c9 0 17 5 22 13C55 13 63 8 72 8c12 0 22 8 22 21 0 15-12 33-44 59z";

function Heart({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 100 96" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="heartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c8566c" />
          <stop offset="1" stopColor="#9d394d" />
        </linearGradient>
      </defs>
      <motion.path
        d={HEART_PATH}
        initial={false}
        animate={{ fill: filled ? "url(#heartFill)" : "rgba(233,184,184,0.28)" }}
        transition={{ duration: 0.6 }}
        stroke="#9d394d"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A heart that beats until touched; then it fills, settles above, and the words appear within its glow. */
export function HeartMessage(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { stage, begin } = useReveal(props);
  const touched = stage !== "closed";
  const open = stage === "open";

  return (
    <div className="flex flex-col items-center py-6" role="group" aria-label={t.types.heart_message.name}>
      <motion.button
        type="button"
        onClick={() => begin(900)}
        disabled={touched}
        aria-label={`${t.types.heart_message.sealHint} — ${t.experience.from(senderName)}`}
        className="relative grid place-items-center disabled:cursor-default"
        animate={touched ? { scale: open ? 0.42 : [1, 1.22, 1], y: open ? -34 : 0 } : { scale: 1 }}
        transition={{ duration: open ? 0.9 : 0.7, ease: EASE }}
        style={{ width: 200, height: open ? 90 : 192 }}
      >
        {touched && !open && (
          <>
            <motion.span initial={{ opacity: 0.5, scale: 0.7 }} animate={{ opacity: 0, scale: 1.7 }} transition={{ duration: 1.1 }} className="absolute inset-4 rounded-full border border-cherry/50" />
            <motion.span initial={{ opacity: 0.4, scale: 0.7 }} animate={{ opacity: 0, scale: 2.2 }} transition={{ duration: 1.4, delay: 0.15 }} className="absolute inset-4 rounded-full border border-rose" />
          </>
        )}
        <Heart filled={touched} className={touched ? "w-40 drop-shadow-[0_10px_18px_rgb(157_57_77/0.35)]" : "w-40 animate-heartbeat"} />
      </motion.button>

      <AnimatePresence>
        {!touched && (
          <motion.p exit={{ opacity: 0 }} className="mt-5 text-sm text-muted">
            {t.types.heart_message.sealHint}
          </motion.p>
        )}
      </AnimatePresence>

      {open && (
        <motion.article
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative -mt-2 w-full overflow-hidden rounded-3xl bg-paper px-7 pb-9 pt-10 text-center shadow-soft"
        >
          <Heart filled className="pointer-events-none absolute left-1/2 top-1/2 w-[78%] -translate-x-1/2 -translate-y-1/2 opacity-[0.07]" />
          <div className="relative space-y-3 font-serif text-[1.3rem] leading-[1.65] text-ink">
            {paragraphs(text).map((p, i) => (
              <Reveal key={i} delay={0.25 + Math.min(i, 8) * 0.2}>
                <p className="whitespace-pre-wrap break-words">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.5 + Math.min(paragraphs(text).length, 8) * 0.2}>
            <p className="relative mt-7 text-xs tracking-[0.18em] text-muted uppercase">{senderName}</p>
            {dateLabel && <p className="relative mt-1 text-xs text-muted">{dateLabel}</p>}
          </Reveal>
        </motion.article>
      )}
    </div>
  );
}
