"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { TypeGlyph } from "@/components/letters/TypeGlyph";
import { t } from "@/content";
import type { MessageType } from "@/lib/message-types";

/** The centrepiece: the newest unopened letter, breathing gently, waiting to be touched. */
export function SealedLetter({ id, type, senderName, when }: { id: string; type: MessageType; senderName: string; when: string }) {
  return (
    <Link href={`/letters/${id}`} className="group block" aria-label={`${t.home.sealedFrom(senderName)}. ${t.types[type].name}. ${t.home.tapToOpen}`}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[2rem] bg-paper px-6 pb-7 pt-9 text-center shadow-lift"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose/30 blur-3xl" aria-hidden />
        <div className="animate-breathe relative mx-auto mb-6 grid h-28 w-40 place-items-center">
          <div className="absolute inset-0 rounded-3xl bg-rose-soft" />
          <div className="relative scale-[2] origin-center">
            <TypeGlyph type={type} size={48} />
          </div>
        </div>
        <p className="relative text-[11px] tracking-[0.22em] text-cherry uppercase">{t.home.waitingForYou}</p>
        <p className="relative mt-2 font-serif text-[1.6rem] leading-tight">{t.home.sealedFrom(senderName)}</p>
        <p className="relative mt-1.5 text-sm text-muted">
          {t.types[type].name} · {when}
        </p>
        <span className="relative mt-6 inline-flex min-h-11 items-center rounded-full bg-cherry px-6 text-[15px] font-medium text-on-cherry transition group-hover:bg-cherry-deep">
          {t.home.tapToOpen}
        </span>
      </motion.div>
    </Link>
  );
}
