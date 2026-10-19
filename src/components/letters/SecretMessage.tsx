"use client";

import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/content";
import { EASE, Reveal, Seal, paragraphs, useReveal, type ExperienceProps } from "./shared";

/** A dark, sealed card. Breaking the seal splits it, lifts the veil, and the words come into focus. */
export function SecretMessage(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { stage, begin } = useReveal(props);
  const broken = stage !== "closed";
  const open = stage === "open";

  return (
    <article
      className="relative overflow-hidden rounded-[1.75rem] px-7 pb-9 pt-10 text-center shadow-lift"
      style={{ background: "linear-gradient(170deg, #4a2530 0%, #2f1a20 60%, #25161a 100%)", color: "#f6e9e4" }}
      aria-label={t.types.secret_message.name}
    >
      <div className="pointer-events-none absolute inset-3 rounded-[1.2rem] border border-white/10" aria-hidden="true" />
      <p className="relative text-[11px] tracking-[0.28em] text-[#e9b8b8]/80 uppercase">{t.experience.from(senderName)}</p>

      <div className="relative mx-auto mt-6 grid min-h-[190px] place-items-center">
        <AnimatePresence mode="wait" initial={false}>
          {!open ? (
            <motion.div key="veil" exit={{ opacity: 0, filter: "blur(12px)" }} transition={{ duration: 0.5 }} className="flex w-full flex-col items-center gap-6">
              <div className="w-full space-y-3 blur-[3px]" aria-hidden="true">
                {[88, 100, 72, 94].map((w, i) => (
                  <div key={i} className="mx-auto h-2 rounded-full bg-white/15" style={{ width: `${w}%` }} />
                ))}
              </div>
              <div className="relative">
                {broken ? (
                  <div className="relative h-16 w-16" aria-hidden="true">
                    <motion.div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(0 0, 55% 0, 40% 100%, 0 100%)" }} animate={{ x: -22, rotate: -18, opacity: 0 }} transition={{ duration: 0.9, ease: EASE }}>
                      <Seal size={64} broken />
                    </motion.div>
                    <motion.div className="absolute inset-0 overflow-hidden" style={{ clipPath: "polygon(55% 0, 100% 0, 100% 100%, 40% 100%)" }} animate={{ x: 22, rotate: 18, opacity: 0 }} transition={{ duration: 0.9, ease: EASE }}>
                      <Seal size={64} broken />
                    </motion.div>
                  </div>
                ) : (
                  <Seal onClick={() => begin(1200)} label={`${t.types.secret_message.sealHint}: ${t.experience.from(senderName)}`} size={64} className="animate-breathe" />
                )}
              </div>
              <p className="text-sm text-[#f6e9e4]/70" aria-hidden={broken}>
                {t.experience.breakSeal}
              </p>
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0, filter: "blur(14px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 1.1, ease: EASE }} className="w-full space-y-3 font-serif text-[1.2rem] leading-[1.75]">
              {paragraphs(text).map((p, i) => (
                <p key={i} className="whitespace-pre-wrap break-words">
                  {p}
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {open && (
        <Reveal delay={0.7} className="relative mt-7">
          {dateLabel && <p className="text-xs text-[#e9b8b8]/70">{dateLabel}</p>}
        </Reveal>
      )}
    </article>
  );
}
