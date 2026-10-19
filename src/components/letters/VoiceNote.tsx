"use client";

import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";
import { t } from "@/content";
import { formatDuration } from "@/lib/media";
import { EASE, paragraphs, useReveal, type ExperienceProps } from "./shared";

const BARS = [8, 14, 22, 12, 28, 18, 10, 24, 16, 30, 12, 20, 26, 14, 9, 22, 17, 11];

/** A voice message: press play and hear them. Counts as opened the first time it plays. */
export function VoiceNote(props: ExperienceProps) {
  const { text, senderName, dateLabel, media } = props;
  const { notify } = useReveal({ ...props, autoOpen: true, deferNotify: true });
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const caption = text.trim() === "Voice note" ? "" : text;

  async function toggle() {
    const a = audio.current;
    if (!a) return;
    if (playing) {
      a.pause();
      return;
    }
    try {
      await a.play();
      notify();
    } catch {
      setFailed(true);
    }
  }

  return (
    <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="rounded-[2rem] bg-paper px-6 py-6 shadow-soft">
      <p className="text-xs tracking-[0.18em] text-muted uppercase">{t.voice.heardFrom(senderName)}</p>
      {media && (
        <audio
          ref={audio}
          src={media.url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
          onError={() => setFailed(true)}
        />
      )}
      <div className="mt-5 flex items-center gap-4">
        <button type="button" onClick={toggle} aria-label={playing ? t.voice.pause : t.voice.play} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-cherry text-on-cherry shadow-soft transition active:scale-95">
          {playing ? <Pause className="h-7 w-7" aria-hidden /> : <Play className="h-7 w-7 translate-x-0.5" aria-hidden />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
            {BARS.map((h, i) => (
              <span key={i} className="w-1.5 rounded-full transition-colors" style={{ height: h + 6, background: i / BARS.length < progress ? "var(--c-cherry)" : "var(--c-rose)" }} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{failed ? t.song.errors.play : media?.seconds ? formatDuration(media.seconds) : ""}</p>
        </div>
      </div>
      {caption && (
        <div className="mt-4 space-y-1.5 text-[1.05rem] leading-relaxed">
          {paragraphs(caption).map((p, i) => (<p key={i} className="whitespace-pre-wrap break-words">{p}</p>))}
        </div>
      )}
      {dateLabel && <p className="mt-3 text-xs text-muted">{dateLabel}</p>}
      <p className="mt-3 text-[11px] text-muted">{t.voice.listenNote}</p>
    </motion.article>
  );
}
