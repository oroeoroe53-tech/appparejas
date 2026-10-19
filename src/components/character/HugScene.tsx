"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useMemo } from "react";
import { renderCharacterSvg } from "@/lib/character";
import { sanitizeCharacter } from "@/lib/character-options";
import { shade } from "@/lib/clothes";
import { HUG_VIBRATION } from "@/lib/notifications";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Two characters walk toward each other and hug, with a few hearts and a soft buzz.
 * `them` is how you drew your person, `me` is how they drew you. Missing ones fall back to the default look.
 */
export function HugScene({ them, me, vibrate = true, label }: { them: unknown; me: unknown; vibrate?: boolean; label: string }) {
  const reduce = useReducedMotion();
  const left = useMemo(() => ({ cfg: sanitizeCharacter(them), svg: renderCharacterSvg(them, "loved") }), [them]);
  const right = useMemo(() => ({ cfg: sanitizeCharacter(me), svg: renderCharacterSvg(me, "loved") }), [me]);

  useEffect(() => {
    if (vibrate && "vibrate" in navigator) navigator.vibrate(HUG_VIBRATION);
    return () => {
      if ("vibrate" in navigator) navigator.vibrate(0);
    };
  }, [vibrate]);

  const arm = (cfg: typeof left.cfg, d: string, hand: [number, number]) => (
    <>
      <motion.path
        d={d}
        fill="none"
        stroke="#000"
        strokeWidth={26}
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: reduce ? 0 : 1.1, duration: 0.5, ease: EASE }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={`#${cfg.topColor}`}
        strokeWidth={17}
        strokeLinecap="round"
        initial={{ pathLength: reduce ? 1 : 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: reduce ? 0 : 1.1, duration: 0.5, ease: EASE }}
      />
      <motion.circle
        cx={hand[0]}
        cy={hand[1]}
        r={11}
        fill={`#${cfg.skinColor}`}
        stroke="#000"
        strokeWidth={4}
        initial={{ opacity: reduce ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 1.5 }}
      />
      <path d={d} fill="none" stroke={`#${shade(cfg.topColor, -0.2)}`} strokeWidth={3} strokeLinecap="round" opacity={0} />
    </>
  );

  return (
    <div role="img" aria-label={label} className="relative mx-auto h-56 w-full max-w-sm select-none">
      <motion.div
        className="absolute bottom-6 left-0 h-36 w-36 overflow-hidden rounded-full bg-paper shadow-lift ring-4 ring-paper [&>svg]:h-full [&>svg]:w-full"
        initial={{ x: reduce ? 52 : -10, rotate: 0 }}
        animate={{ x: 52, rotate: 7 }}
        transition={{ duration: reduce ? 0 : 1, ease: EASE }}
        dangerouslySetInnerHTML={{ __html: left.svg }}
      />
      <motion.div
        className="absolute bottom-6 right-0 h-36 w-36 overflow-hidden rounded-full bg-paper shadow-lift ring-4 ring-paper [&>svg]:h-full [&>svg]:w-full"
        initial={{ x: reduce ? -52 : 10, rotate: 0 }}
        animate={{ x: -52, rotate: -7 }}
        transition={{ duration: reduce ? 0 : 1, ease: EASE }}
        dangerouslySetInnerHTML={{ __html: right.svg }}
      />
      {/* The arms wrap around each other once they are close. */}
      <svg viewBox="0 0 384 224" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {arm(left.cfg, "M112 208C150 196 214 192 258 202", [258, 202])}
        {arm(right.cfg, "M272 206C236 186 172 182 126 196", [126, 196])}
      </svg>
      {!reduce &&
        [0, 1, 2, 3, 4].map((i) => (
          <motion.span
            key={i}
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-16 text-cherry"
            initial={{ opacity: 0, y: 0, x: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], y: -70 - (i % 3) * 18, x: (i - 2) * 30, scale: 1 }}
            transition={{ delay: 1.4 + i * 0.18, duration: 1.8, ease: "easeOut", repeat: Infinity, repeatDelay: 1 }}
          >
            <Heart className="h-5 w-5 fill-current" />
          </motion.span>
        ))}
    </div>
  );
}
