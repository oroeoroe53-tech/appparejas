"use client";

import { AnimatePresence, motion } from "framer-motion";
import { t } from "@/content";
import { EASE, Seal, paragraphs, useReveal, type ExperienceProps } from "./shared";

/** Deterministic ragged outline, so the parchment looks torn and burnt without any server/client mismatch. */
function raggedPolygon(): string {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const pts: string[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) pts.push(`${((i / n) * 100).toFixed(2)}% ${(rnd() * 1.1).toFixed(2)}%`);
  for (let i = 1; i <= 16; i++) pts.push(`${(99.2 + rnd() * 0.8).toFixed(2)}% ${((i / 17) * 100).toFixed(2)}%`);
  for (let i = n; i >= 0; i--) pts.push(`${((i / n) * 100).toFixed(2)}% ${(98.9 + rnd() * 1.1).toFixed(2)}%`);
  for (let i = 16; i >= 1; i--) pts.push(`${(rnd() * 0.8).toFixed(2)}% ${((i / 17) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(",")})`;
}
const RAGGED = raggedPolygon();

function Scroll({ opening, onOpen, label }: { opening: boolean; onOpen: () => void; label: string }) {
  return (
    <div className="relative mx-auto h-[200px] w-[310px]" role="group" aria-label={t.a11y.sealedEnvelope}>
      <motion.div
        className="absolute inset-x-6 inset-y-6 rounded-md shadow-lift"
        style={{ background: "linear-gradient(180deg, #d8bb84 0%, #f1dfb3 22%, #e6cf9e 55%, #c9a56a 100%)", transform: "rotate(-1.5deg)" }}
        animate={opening ? { scaleY: 1.08 } : { scaleY: 1 }}
        transition={{ duration: 0.6 }}
      />
      {[0, 1].map((side) => (
        <div
          key={side}
          aria-hidden="true"
          className="absolute top-4 h-[168px] w-9 rounded-full shadow-soft"
          style={{
            [side === 0 ? "left" : "right"]: 6,
            background: "radial-gradient(ellipse at 40% 50%, #f3e3b8 0 25%, #d9bd86 45%, #b48f55 100%)",
            transform: `rotate(${side === 0 ? -1.5 : -1.5}deg)`,
          }}
        />
      ))}
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-4 left-1/2 w-9 -translate-x-1/2 shadow-soft"
        style={{ background: "linear-gradient(90deg, #7f2c3e, #a8465a 50%, #7f2c3e)" }}
        animate={opening ? { scaleY: 0.2, opacity: 0 } : { scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
        animate={opening ? { opacity: 0, scale: 0.6, rotate: 12 } : { opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.45 }}
      >
        <Seal onClick={onOpen} label={label} size={66} className="animate-breathe" />
      </motion.div>
    </div>
  );
}

/** A rolled parchment tied with a red ribbon and sealed in wax. Break the seal, it unrolls, the ink appears line by line. */
export function OldLetter(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { stage, begin, reduce } = useReveal(props);
  const lines = paragraphs(text);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {stage !== "open" ? (
        <motion.div key="scroll" exit={{ opacity: 0, y: 18, scale: 0.96 }} transition={{ duration: 0.45, ease: EASE }} className="flex flex-col items-center gap-8 py-6">
          <Scroll opening={stage === "opening"} onOpen={() => begin(1000)} label={`${t.types.old_letter.sealHint}: ${t.experience.from(senderName)}`} />
          <p className="text-sm text-muted" aria-hidden={stage === "opening"}>
            {t.types.old_letter.sealHint}
          </p>
        </motion.div>
      ) : (
        <motion.div key="parchment" initial={{ opacity: 0.2, clipPath: "inset(0 0 100% 0)" }} animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }} transition={{ duration: reduce ? 0 : 1.3, ease: EASE }} className="drop-shadow-[0_18px_28px_rgb(70_40_10/0.35)]">
          <article className="parchment relative px-8 pb-12 pt-10" style={{ clipPath: RAGGED }} aria-label={t.a11y.openedLetter}>
            <p className="text-center font-old text-[0.7rem] tracking-[0.35em] text-[#7a5a32] uppercase">{t.experience.from(senderName)}</p>
            <p aria-hidden="true" className="mt-1 text-center font-quill text-3xl text-[#7f2c3e]">✦</p>
            {dateLabel && <p className="mt-1 text-center font-old text-xs italic text-[#7a5a32]">{dateLabel}</p>}
            <div className="mt-7 space-y-4 font-old text-[1.22rem] leading-[1.75] text-[#3b2a1a]">
              {lines.map((p, i) => (
                <motion.p
                  key={i}
                  initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.4 }}
                  animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : 1 + Math.min(i, 8) * 0.9, ease: "easeOut" }}
                  className={`whitespace-pre-wrap break-words ${i === 0 ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-gothic first-letter:text-[3.4rem] first-letter:leading-[0.8] first-letter:text-[#8c2f42]" : ""}`}
                >
                  {p}
                </motion.p>
              ))}
            </div>
            <motion.div
              className="mt-10 flex items-end justify-between"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduce ? 0 : 1.2 + Math.min(lines.length, 8) * 0.9, duration: 0.6 }}
            >
              <p className="font-quill text-[2.2rem] leading-none text-[#5a3517]">{senderName}</p>
              <motion.span
                initial={{ scale: reduce ? 1 : 1.7, opacity: 0, rotate: -14 }}
                animate={{ scale: 1, opacity: 1, rotate: -8 }}
                transition={{ delay: reduce ? 0 : 1.5 + Math.min(lines.length, 8) * 0.9, type: "spring", stiffness: 220, damping: 14 }}
              >
                <Seal size={58} />
              </motion.span>
            </motion.div>
          </article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
