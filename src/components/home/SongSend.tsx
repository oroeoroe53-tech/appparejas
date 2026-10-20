"use client";

import { Music2 } from "lucide-react";
import { useRef, useState } from "react";
import { sendMessageAction } from "@/app/actions/messages";
import { SongPicker } from "@/components/songs/SongPicker";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import type { SongClip } from "@/lib/songs";
import { cn } from "@/lib/utils";

/** Pick a song and a few seconds of it; it arrives as a message that starts playing when they open it. */
export function SongSend({ partnerName }: { partnerName: string }) {
  const [open, setOpen] = useState(false);
  const [song, setSong] = useState<SongClip | null>(null);
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string>();
  const lock = useRef(false);

  async function send() {
    if (!song || lock.current) return;
    lock.current = true;
    setSending(true);
    setError(undefined);
    try {
      const res = await sendMessageAction({
        content: t.song.sendContent(song.title, song.artist),
        type: "quick",
        clientId: crypto.randomUUID(),
        song: { trackId: song.trackId, start: song.start, duration: song.duration },
      });
      if (res.ok) {
        setState("sent");
        setSong(null);
        setOpen(false);
        window.setTimeout(() => setState("idle"), 4000);
      } else {
        setState("error");
        setError(res.error);
      }
    } catch {
      setState("error");
      setError(t.write.errors.generic);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${t.song.sendButton} — ${partnerName}`}
        className={cn(
          "inline-flex min-h-12 items-center gap-2.5 rounded-full border px-6 text-[15px] font-medium transition active:scale-95",
          state === "sent" ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper text-cherry hover:border-cherry",
        )}
      >
        <Music2 className="h-5 w-5" aria-hidden />
        {state === "sent" ? t.song.sent : t.song.sendButton}
      </button>
      {open && (
        <div className="mt-3 w-full rounded-3xl border border-line bg-paper p-4 text-left shadow-soft">
          <SongPicker value={song} onChange={setSong} title={t.song.sendTitle} />
          {song && (
            <button
              type="button"
              onClick={send}
              disabled={sending}
              aria-busy={sending}
              className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cherry px-6 font-medium text-on-cherry shadow-soft transition active:scale-[0.98] disabled:opacity-60"
            >
              {sending ? (<><Spinner /> {t.song.sending}</>) : t.song.sendAction}
            </button>
          )}
        </div>
      )}
      <p role={state === "error" ? "alert" : "status"} className="mt-2 min-h-5 text-xs text-muted">{state === "error" ? error : ""}</p>
    </div>
  );
}
