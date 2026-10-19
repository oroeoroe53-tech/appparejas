"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { t } from "@/content";
import { formatClock, type SongClip } from "@/lib/songs";

export interface SongPlayerHandle {
  /** Starts the clip. Resolves false if the browser refused (no user gesture) so the UI can fall back to the button. */
  play: () => Promise<boolean>;
  stop: () => void;
}

/** Plays just the chosen part of a 30-second preview, with a progress bar. */
export function SongPlayer({ clip, ref }: { clip: SongClip; ref?: React.Ref<SongPlayerHandle> }) {
  const audio = useRef<HTMLAudioElement>(null);
  const pendingSeek = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);
  const end = clip.start + clip.duration;

  const stop = useCallback(() => {
    const a = audio.current;
    if (a) {
      a.pause();
      if (a.readyState >= 1) a.currentTime = clip.start;
    }
    setPlaying(false);
    setProgress(0);
  }, [clip.start]);

  const play = useCallback(async () => {
    const a = audio.current;
    if (!a) return false;
    setFailed(false);
    if (a.readyState >= 1) a.currentTime = clip.start;
    else pendingSeek.current = true;
    try {
      await a.play();
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      return false;
    }
  }, [clip.start]);

  useImperativeHandle(ref, () => ({ play, stop }), [play, stop]);

  // A different clip (e.g. the sender changed the song): start clean.
  useEffect(() => {
    const a = audio.current;
    return () => {
      a?.pause();
    };
  }, [clip.previewUrl, clip.start, clip.duration]);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-paper p-3 pr-4 shadow-soft">
      <audio
        ref={audio}
        src={clip.previewUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          if (pendingSeek.current) {
            e.currentTarget.currentTime = clip.start;
            pendingSeek.current = false;
          }
        }}
        onTimeUpdate={(e) => {
          const time = e.currentTarget.currentTime;
          if (time >= end) stop();
          else setProgress(Math.min(1, Math.max(0, (time - clip.start) / clip.duration)));
        }}
        onEnded={stop}
        onError={() => {
          setFailed(true);
          setPlaying(false);
        }}
      />
      {clip.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={clip.artworkUrl} alt="" width={56} height={56} referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-rose-soft text-cherry" aria-hidden>♪</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{clip.title}</p>
        <p className="truncate text-sm text-muted">{clip.artist}</p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-label={clip.title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-cherry transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-muted">{failed ? t.song.errors.play : `${formatClock(clip.start)} – ${formatClock(end)}`}</p>
      </div>
      <button
        type="button"
        onClick={() => (playing ? stop() : void play())}
        aria-label={`${playing ? t.song.pause : t.song.play}: ${clip.title}`}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cherry text-on-cherry shadow-soft transition active:scale-95"
      >
        {playing ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5 translate-x-px" aria-hidden />}
      </button>
    </div>
  );
}
