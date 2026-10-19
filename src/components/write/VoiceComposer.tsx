"use client";

import { Mic, RotateCcw, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendMessageAction, type SendResult } from "@/app/actions/messages";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { audioFormat, formatDuration, MAX_VOICE_SECONDS } from "@/lib/media";
import { discardUpload, uploadMedia } from "@/lib/media-client";
import { useOnline } from "@/lib/use-client";
import { SchedulePicker, scheduleToIso } from "./SchedulePicker";

const MIME_PREFERENCE = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"];

export function VoiceComposer({ spaceId, minDate, onSent }: { spaceId: string; minDate: string; onSent: (r: Extract<SendResult, { ok: true }>) => void }) {
  const [phase, setPhase] = useState<"idle" | "recording" | "recorded" | "sending">("idle");
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [capsule, setCapsule] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const online = useOnline();
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const clientId = useRef(crypto.randomUUID());
  const uploaded = useRef<{ path: string; seconds: number } | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function start() {
    setError(undefined);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t.media.errors.micUnsupported);
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t.media.errors.mic);
      return;
    }
    const mime = MIME_PREFERENCE.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
    const rec = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    rec.onstop = () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      const type = rec.mimeType || mime || "audio/webm";
      const recorded = new Blob(chunks.current, { type });
      setBlob(recorded);
      setUrl(URL.createObjectURL(recorded));
      setSeconds(Math.max(1, Math.round((performance.now() - startedAt.current) / 1000)));
      setPhase("recorded");
    };
    recorder.current = rec;
    uploaded.current = null;
    clientId.current = crypto.randomUUID();
    startedAt.current = performance.now();
    setSeconds(0);
    setPhase("recording");
    rec.start();
    timer.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt.current) / 1000;
      setSeconds(Math.floor(elapsed));
      if (elapsed >= MAX_VOICE_SECONDS) stop();
    }, 250);
  }

  function stop() {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
  }

  function reset() {
    if (uploaded.current) void discardUpload(uploaded.current.path);
    uploaded.current = null;
    setBlob(null);
    setUrl(null);
    setSeconds(0);
    setPhase("idle");
  }

  async function send() {
    if (lock.current || !blob) return;
    if (!navigator.onLine) {
      setError(t.write.offline);
      return;
    }
    lock.current = true;
    setPhase("sending");
    setError(undefined);
    try {
      // Upload once; a retry after a failed send reuses the same file and the same idempotency key.
      if (!uploaded.current) {
        const { contentType, ext } = audioFormat(blob.type);
        uploaded.current = { path: await uploadMedia(spaceId, "voice", blob, ext, contentType), seconds };
      }
      const res = await sendMessageAction({
        content: caption,
        type: "voice_note",
        clientId: clientId.current,
        attachment: uploaded.current,
        deliverAt: capsule ? scheduleToIso(capsule) : null,
      });
      if (res.ok) onSent(res);
      else {
        uploaded.current = null; // the server removed the file when it refused the message
        setError(res.error);
        setPhase("recorded");
      }
    } catch {
      setError(t.media.errors.upload);
      setPhase("recorded");
    } finally {
      lock.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="font-serif text-2xl">{t.voice.title}</h2>
        <p className="mt-1 text-[15px] text-muted">{t.voice.hint}</p>
      </div>

      <div className="grid place-items-center rounded-[2rem] bg-paper px-6 py-10 shadow-soft">
        {phase === "idle" && (
          <button type="button" onClick={start} aria-label={t.voice.record} className="grid h-24 w-24 place-items-center rounded-full bg-cherry text-on-cherry shadow-lift transition active:scale-95">
            <Mic className="h-10 w-10" aria-hidden />
          </button>
        )}
        {phase === "recording" && (
          <>
            <button type="button" onClick={stop} aria-label={t.voice.stop} className="relative grid h-24 w-24 place-items-center rounded-full bg-cherry text-on-cherry shadow-lift">
              <span className="absolute inset-0 animate-ping rounded-full bg-cherry/30" aria-hidden />
              <Square className="relative h-9 w-9 fill-current" aria-hidden />
            </button>
            <p role="timer" className="mt-4 text-sm text-muted">{t.voice.recording(formatDuration(seconds))}</p>
          </>
        )}
        {(phase === "recorded" || phase === "sending") && url && (
          <div className="w-full text-center">
            <audio controls src={url} className="w-full" />
            <p className="mt-2 text-sm text-muted">{t.voice.ready(formatDuration(seconds))}</p>
            <Button variant="ghost" className="mt-2 min-h-10 px-4" onClick={reset} disabled={phase === "sending"}>
              <RotateCcw className="h-4 w-4" aria-hidden /> {t.voice.reRecord}
            </Button>
          </div>
        )}
      </div>

      {(phase === "recorded" || phase === "sending") && (
        <>
          <div className="space-y-1.5">
            <label htmlFor="voice-caption" className="block text-sm font-medium">{t.voice.captionLabel}</label>
            <textarea id="voice-caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={2} maxLength={300} className="w-full resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base focus:border-cherry focus:outline-none focus:ring-2 focus:ring-cherry/25" />
          </div>
          <SchedulePicker value={capsule} onChange={setCapsule} minDate={minDate} />
          <Button className="w-full" onClick={send} disabled={phase === "sending" || !online} aria-busy={phase === "sending"}>
            {phase === "sending" ? (<><Spinner /> {t.voice.sending}</>) : (<><Send className="h-4 w-4" aria-hidden /> {t.voice.send}</>)}
          </Button>
        </>
      )}
      <FormMessage error={error} />
    </div>
  );
}
