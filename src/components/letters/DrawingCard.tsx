"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { FullscreenImage } from "@/components/media/FullscreenImage";
import { t } from "@/content";
import { EASE, paragraphs, useReveal, type ExperienceProps } from "./shared";

/** A drawing pinned like a polaroid. */
export function DrawingCard(props: ExperienceProps) {
  const { text, senderName, dateLabel, media } = props;
  const { notify, after } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  useEffect(() => after(1200, notify), [after, notify]);
  const caption = text.trim() === "Drawing" ? "" : text;

  return (
    <div className="py-4">
      <motion.figure
        initial={{ opacity: 0, y: -28, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 1.2 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative mx-auto max-w-[340px] rounded-[3px] bg-[#fffdf8] px-3.5 pb-5 pt-3.5 text-[#382d2a] shadow-lift"
      >
        <span aria-hidden="true" className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-2 rounded-[2px] bg-rose/75 shadow-sm" />
        {media ? (
          <FullscreenImage src={media.url} alt={t.drawing.from(senderName)} className="aspect-square w-full rounded-[2px] bg-[#fffdf8] object-contain" />
        ) : (
          <div className="aspect-square w-full bg-cream" />
        )}
        <figcaption className="mt-3 px-1">
          {caption && paragraphs(caption).map((p, i) => (<p key={i} className="whitespace-pre-wrap break-words font-hand text-[1.6rem] leading-snug">{p}</p>))}
          <p className="mt-1 text-right font-hand text-xl text-[#9d394d]">— {senderName}</p>
          {dateLabel && <p className="text-right text-[11px] text-[#8a6d66]">{dateLabel}</p>}
        </figcaption>
      </motion.figure>
    </div>
  );
}
