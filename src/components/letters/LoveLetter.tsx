"use client";

import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/content";
import { EASE, Reveal, Seal, paragraphs, useReveal, type ExperienceProps } from "./shared";

/** A sealed envelope: the flap lifts, the letter rises, then the page of the letter takes over. */
export function LoveLetter(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { stage, begin } = useReveal(props);
  const opening = stage === "opening";

  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage !== "open" ? (
        <motion.div
          key="envelope"
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="flex flex-col items-center gap-8 py-6"
        >
          <div className="relative h-[216px] w-[304px]" style={{ perspective: 1000 }} role="group" aria-label={t.a11y.sealedEnvelope}>
            <div className="absolute inset-0 rounded-xl bg-[#e2c1b8] shadow-lift" />
            <motion.div
              className="paper absolute inset-x-5 top-4 h-[170px] rounded-md px-5 pt-5 shadow-soft"
              animate={opening ? { y: -78 } : { y: 0 }}
              transition={{ delay: 0.55, duration: 0.8, ease: EASE }}
              aria-hidden="true"
            >
              <div className="space-y-2 opacity-40">
                <div className="h-1.5 w-2/3 rounded-full bg-ink/40" />
                <div className="h-1.5 w-full rounded-full bg-ink/25" />
                <div className="h-1.5 w-5/6 rounded-full bg-ink/25" />
              </div>
            </motion.div>
            <div
              className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#f1dcd4] to-[#ead0c7]"
              style={{ clipPath: "polygon(0 0, 50% 64%, 100% 0, 100% 100%, 0 100%)" }}
            />
            <motion.div
              className="absolute inset-x-0 top-0 h-[64%] origin-top bg-gradient-to-b from-[#e6c8be] to-[#ddb8ad]"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
              initial={false}
              animate={opening ? { rotateX: 180, zIndex: [3, 3, 0] } : { rotateX: 0, zIndex: 3 }}
              transition={{ duration: 0.7, ease: EASE }}
              aria-hidden="true"
            />
            <motion.div
              className="absolute left-1/2 top-[50%] z-10 -translate-x-1/2 -translate-y-1/2"
              animate={opening ? { opacity: 0, scale: 0.6, y: -10 } : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Seal onClick={() => begin(1500)} label={`${t.experience.openLetter} ${t.experience.from(senderName)}`} size={60} className="animate-breathe" />
            </motion.div>
          </div>
          <p className="text-sm text-muted" aria-hidden={opening}>
            {t.types.love_letter.sealHint}
          </p>
        </motion.div>
      ) : (
        <motion.article
          key="letter"
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="paper relative rounded-lg px-7 pb-9 pt-8 shadow-lift"
          aria-label={t.a11y.openedLetter}
        >
          <div className="absolute inset-x-7 top-0 h-px bg-gradient-to-r from-transparent via-rose to-transparent" aria-hidden="true" />
          <Reveal delay={0.15}>
            <p className="text-[11px] tracking-[0.2em] text-[#8a6d66] uppercase">{t.experience.from(senderName)}</p>
            {dateLabel && <p className="mt-1 text-xs text-[#8a6d66]">{dateLabel}</p>}
          </Reveal>
          <div className="mt-6 space-y-4 font-serif text-[1.15rem] leading-[1.85] italic">
            {paragraphs(text).map((p, i) => (
              <Reveal key={i} delay={0.35 + Math.min(i, 8) * 0.18}>
                <p className="whitespace-pre-wrap break-words">{p}</p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={0.6 + Math.min(paragraphs(text).length, 8) * 0.18}>
            <p className="mt-8 font-serif text-[#9d394d]">— {senderName}</p>
          </Reveal>
        </motion.article>
      )}
    </AnimatePresence>
  );
}
