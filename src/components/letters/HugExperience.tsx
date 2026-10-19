"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";
import { HugScene } from "@/components/character/HugScene";
import { t } from "@/content";
import { EASE, useReveal, type ExperienceProps } from "./shared";

/** The hug arrives as a little scene: both of you, holding each other, and the phone buzzing. */
export function HugExperience(props: ExperienceProps) {
  const { senderName, dateLabel, hug } = props;
  const { notify, after } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  useEffect(() => after(1200, notify), [after, notify]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-col items-center py-6 text-center">
      <HugScene them={hug?.them ?? null} me={hug?.me ?? null} label={t.hug.received(senderName)} />
      <p className="mt-4 font-serif text-2xl">{t.hug.received(senderName)}</p>
      {dateLabel && <p className="mt-2 text-sm text-muted">{dateLabel}</p>}
    </motion.div>
  );
}
