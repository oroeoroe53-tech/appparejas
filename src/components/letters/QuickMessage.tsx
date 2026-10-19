"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { EASE, paragraphs, useReveal, type ExperienceProps } from "./shared";

/** No ceremony: the words, right there, like a message from someone you know. */
export function QuickMessage(props: ExperienceProps) {
  const { text, senderName, dateLabel } = props;
  const { notify, after } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  // Counted as read once it has been on screen for a moment.
  useEffect(() => after(1000, notify), [after, notify]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-3xl rounded-tl-lg bg-paper px-6 py-5 shadow-soft"
    >
      <p className="text-xs tracking-[0.18em] text-muted uppercase">{senderName}</p>
      <div className="mt-2 space-y-2 text-[1.12rem] leading-relaxed">
        {paragraphs(text).map((p, i) => (
          <p key={i} className="whitespace-pre-wrap break-words">{p}</p>
        ))}
      </div>
      {dateLabel && <p className="mt-3 text-xs text-muted">{dateLabel}</p>}
    </motion.article>
  );
}
