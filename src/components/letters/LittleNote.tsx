"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { t } from "@/content";
import { EASE, useReveal, type ExperienceProps } from "./shared";

/** A note that is simply there: it drops onto the page, pinned with tape. No ceremony, no friction. */
export function LittleNote(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { notify, after } = useReveal({ ...props, autoOpen: true, deferNotify: true });

  // The reader sees it immediately; count it as opened once it has had a moment on screen.
  useEffect(() => {
    after(900, notify);
  }, [after, notify]);

  return (
    <div className="py-6">
      <motion.article
        initial={{ opacity: 0, y: -36, rotate: -5 }}
        animate={{ opacity: 1, y: 0, rotate: -1.6 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="paper relative mx-auto max-w-[330px] rounded-[3px] px-6 pb-7 pt-9 shadow-lift"
        style={{
          backgroundImage:
            "repeating-linear-gradient(transparent 0 33px, rgb(157 57 77 / 0.10) 33px 34px), linear-gradient(180deg, rgb(255 255 255 / 0.5), rgb(247 238 226 / 0.4))",
        }}
        aria-label={t.types.little_note.name}
      >
        <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 rotate-2 rounded-[2px] bg-rose/75 shadow-sm" />
        <p className="whitespace-pre-wrap break-words font-hand text-[1.85rem] leading-[34px] text-[#382d2a]">{text}</p>
        <p className="mt-5 text-right font-hand text-xl text-[#9d394d]">— {senderName}</p>
        {dateLabel && <p className="mt-1 text-right text-[11px] tracking-wide text-[#8a6d66]">{dateLabel}</p>}
      </motion.article>
    </div>
  );
}
