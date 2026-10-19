"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, RotateCcw, Send, WifiOff } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendMessageAction, type SendResult } from "@/app/actions/messages";
import { MessageExperience } from "@/components/letters/MessageExperience";
import { TypeGlyph } from "@/components/letters/TypeGlyph";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { SchedulePicker, scheduleToIso } from "./SchedulePicker";
import { SongPicker } from "@/components/songs/SongPicker";
import { SongPlayer, type SongPlayerHandle } from "@/components/songs/SongPlayer";
import { isAppleArtworkUrl, isApplePreviewUrl, type SongClip } from "@/lib/songs";
import { t } from "@/content";
import { isLetterStyle, LETTER_STYLES, MESSAGE_LIMITS, type LetterStyle } from "@/lib/message-types";
import { useIsClient, useOnline } from "@/lib/use-client";
import { cn } from "@/lib/utils";

type Step = "write" | "style" | "preview";
const STEPS: Step[] = ["write", "style", "preview"];
const DRAFT_KEY = "us-draft-v1";

interface Draft {
  text: string;
  type: LetterStyle;
  clientId: string;
  song: SongClip | null;
}

function validSong(value: unknown): SongClip | null {
  const v = value as Partial<SongClip> | null;
  if (!v || typeof v !== "object") return null;
  const ok =
    typeof v.trackId === "string" && /^\d{1,20}$/.test(v.trackId) && typeof v.title === "string" && typeof v.artist === "string" &&
    typeof v.previewUrl === "string" && isApplePreviewUrl(v.previewUrl) &&
    (v.artworkUrl === null || (typeof v.artworkUrl === "string" && isAppleArtworkUrl(v.artworkUrl))) &&
    Number.isInteger(v.start) && Number.isInteger(v.duration);
  return ok ? (v as SongClip) : null;
}

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (typeof parsed.text !== "string" || !isLetterStyle(parsed.type) || typeof parsed.clientId !== "string") return null;
    return { text: parsed.text, type: parsed.type, clientId: parsed.clientId, song: validSong(parsed.song) };
  } catch {
    return null;
  }
}

function saveDraft(draft: Draft | null) {
  try {
    if (draft && draft.text.trim()) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Drafts are a convenience; ignore blocked storage.
  }
}

const newId = () => crypto.randomUUID();

interface ComposerProps {
  senderName: string;
  partnerName: string;
  isReply: boolean;
  minDate: string;
  onSent: (result: Extract<SendResult, { ok: true }>) => void;
}

/** Drafts live in localStorage, so the editor only mounts on the client (avoids hydration mismatches). */
export function Composer(props: ComposerProps) {
  const isClient = useIsClient();
  if (!isClient) return <div className="h-72 animate-pulse rounded-2xl bg-paper/70" aria-hidden />;
  return <ComposerEditor {...props} />;
}

function ComposerEditor({ senderName, partnerName, isReply, minDate, onSent }: ComposerProps) {
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState<Step>("write");
  const [text, setText] = useState(draft?.text ?? "");
  const [type, setType] = useState<LetterStyle>(draft?.type ?? "love_letter");
  const [clientId, setClientId] = useState<string>(() => draft?.clientId ?? newId());
  const [song, setSong] = useState<SongClip | null>(draft?.song ?? null);
  const songPlayer = useRef<SongPlayerHandle>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [capsule, setCapsule] = useState<string | null>(null);
  const online = useOnline();
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const lock = useRef(false);
  const editor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    saveDraft({ text, type, clientId, song });
  }, [text, type, clientId, song]);

  const maxChars = MESSAGE_LIMITS[type];
  const length = Array.from(text).length;
  const trimmedEmpty = text.trim().length === 0;
  const tooLong = length > maxChars;

  const go = (next: Step) => {
    setError(undefined);
    setStep(next);
    if (next === "preview") setPreviewKey((k) => k + 1);
  };

  const send = useCallback(async () => {
    // The ref blocks double taps before React re-renders the disabled state.
    if (lock.current || trimmedEmpty || tooLong) return;
    if (!navigator.onLine) {
      setError(t.write.offline);
      return;
    }
    lock.current = true;
    setSending(true);
    setError(undefined);
    try {
      const res = await sendMessageAction({ content: text, type, clientId, song: song ? { trackId: song.trackId, start: song.start, duration: song.duration } : null, deliverAt: capsule ? scheduleToIso(capsule) : null });
      if (res.ok) {
        saveDraft(null);
        onSent(res);
      } else {
        setError(res.error);
      }
    } catch {
      // Network failure: nothing is known to be delivered, and the same clientId makes a retry safe.
      setError(t.write.errors.generic);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }, [capsule, clientId, onSent, song, text, tooLong, trimmedEmpty, type]);

  function discard() {
    saveDraft(null);
    setText("");
    setSong(null);
    setClientId(newId());
    setConfirmDiscard(false);
    setStep("write");
    editor.current?.focus();
  }

  const stepIndex = STEPS.indexOf(step);
  return (
    <div>
      <ol className="mb-6 flex items-center gap-2 text-xs" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === stepIndex ? "step" : undefined} className="flex items-center gap-2">
            <span className={cn("grid h-6 w-6 place-items-center rounded-full text-[11px]", i < stepIndex ? "bg-cherry text-on-cherry" : i === stepIndex ? "border border-cherry text-cherry" : "border border-line text-muted")}>
              {i < stepIndex ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
            </span>
            <span className={cn(i === stepIndex ? "text-ink" : "text-muted")}>{t.write.steps[s]}</span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line" aria-hidden />}
          </li>
        ))}
      </ol>

      {!online && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t.write.offline}
        </p>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28 }}>
          {step === "write" && (
            <div>
              {isReply && <p className="mb-3 text-sm text-muted">{t.write.replyingTo}</p>}
              <label htmlFor="message" className="sr-only">{t.write.textLabel}</label>
              <div className="paper rounded-2xl px-5 pb-4 pt-5 shadow-soft">
                <p className="mb-2 text-xs tracking-[0.18em] text-[#8a6d66] uppercase">{t.experience.to(partnerName)}</p>
                <textarea
                  id="message"
                  ref={editor}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.write.placeholder}
                  rows={9}
                  aria-describedby="counter"
                  aria-invalid={tooLong}
                  className="w-full resize-none bg-transparent font-serif text-[1.2rem] leading-[1.8] text-[#382d2a] italic placeholder:text-[#a89c95] focus:outline-none"
                />
                <p id="counter" className={cn("text-right text-xs", tooLong ? "text-cherry" : "text-[#8a6d66]")}>{t.write.counter(length, maxChars)}</p>
              </div>
              {tooLong && <p role="alert" className="mt-3 text-sm text-cherry">{t.write.errors.tooLong(maxChars)}</p>}
              <SongPicker value={song} onChange={setSong} />
              <p className="mt-3 text-[13px] text-muted">{t.write.draftSaved}</p>
              <div className="mt-6 flex items-center justify-between gap-3">
                {confirmDiscard ? (
                  <div className="flex items-center gap-2 text-sm" role="alertdialog" aria-label={t.write.discardConfirm}>
                    <span>{t.write.discardConfirm}</span>
                    <Button variant="danger" className="min-h-10 px-4" onClick={discard}>{t.write.discardYes}</Button>
                    <Button variant="ghost" className="min-h-10 px-3" onClick={() => setConfirmDiscard(false)}>{t.write.keepWriting}</Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => (trimmedEmpty ? discard() : setConfirmDiscard(true))} disabled={trimmedEmpty}>{t.write.discard}</Button>
                )}
                <Button onClick={() => go("style")} disabled={trimmedEmpty}>{t.write.toStyle}</Button>
              </div>
              {trimmedEmpty && length > 0 && <p role="alert" className="mt-3 text-sm text-cherry">{t.write.errors.empty}</p>}
            </div>
          )}

          {step === "style" && (
            <div>
              <h2 className="font-serif text-2xl">{t.write.chooseStyle}</h2>
              <p className="mt-1.5 text-[15px] text-muted">{t.write.chooseStyleHint}</p>
              <div role="radiogroup" aria-label={t.write.chooseStyle} className="mt-5 space-y-3">
                {LETTER_STYLES.map((m) => {
                  const fits = length <= MESSAGE_LIMITS[m];
                  const selected = type === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={!fits}
                      onClick={() => setType(m)}
                      className={cn("flex w-full items-center gap-4 rounded-2xl border bg-paper p-4 text-left transition disabled:opacity-50", selected ? "border-cherry shadow-soft ring-1 ring-cherry" : "border-line hover:border-stone")}
                    >
                      <span className="grid h-14 w-16 shrink-0 place-items-center rounded-xl bg-rose-soft"><TypeGlyph type={m} size={44} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.types[m].name}</span>
                        <span className="block text-sm text-muted">{fits ? t.types[m].tagline : t.write.errors.tooLong(MESSAGE_LIMITS[m])}</span>
                      </span>
                      {selected && <Check className="h-5 w-5 shrink-0 text-cherry" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-between gap-3">
                <Button variant="ghost" onClick={() => go("write")}><ArrowLeft className="h-4 w-4" aria-hidden /> {t.write.editMessage}</Button>
                <Button onClick={() => go("preview")} disabled={tooLong}>{t.write.toPreview}</Button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <p className="mb-4 text-sm text-muted">{t.write.previewHint}</p>
              <MessageExperience key={previewKey} type={type} text={text} senderName={senderName} dateLabel={t.write.steps.preview} onOpenStart={() => void songPlayer.current?.play()} />
              {song && (
                <div className="mt-4">
                  <p className="mb-2 text-xs tracking-[0.2em] text-muted uppercase">{t.song.headingSent}</p>
                  <SongPlayer ref={songPlayer} clip={song} />
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" className="min-h-10 px-4" onClick={() => setPreviewKey((k) => k + 1)}><RotateCcw className="h-4 w-4" aria-hidden /> {t.write.previewReplay}</Button>
                <Button variant="ghost" className="min-h-10 px-4" onClick={() => go("write")}>{t.write.editMessage}</Button>
                <Button variant="ghost" className="min-h-10 px-4" onClick={() => go("style")}>{t.write.editStyle}</Button>
              </div>
              <div className="mt-5"><SchedulePicker value={capsule} onChange={setCapsule} minDate={minDate} /></div>
              <FormMessage error={error} className="mt-4" />
              <Button className="mt-6 w-full" onClick={send} disabled={sending || !online || trimmedEmpty || tooLong} aria-busy={sending}>
                {sending ? (<><Spinner /> {t.write.sending}</>) : (<><Send className="h-4 w-4" aria-hidden /> {t.write.send}</>)}
              </Button>
              <p className="mt-3 text-center text-[13px] text-muted">{t.experience.to(partnerName)}</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function SentView({ partnerName, push, onAnother }: { partnerName: string; push: Extract<SendResult, { ok: true }>["push"]; onAnother: () => void }) {
  const pushLine = push === "sent" ? t.write.pushSent : push === "failed" ? t.write.pushFailed : push === "skipped" ? t.write.pushSkipped : push === "scheduled" ? t.write.pushScheduled : null;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center pt-10 text-center" role="status">
      <div className="relative grid h-32 w-32 place-items-center">
        <motion.span initial={{ scale: 0.4, opacity: 0.6 }} animate={{ scale: 1.8, opacity: 0 }} transition={{ duration: 1.4, ease: "easeOut" }} className="absolute inset-0 rounded-full border border-rose" />
        <motion.div initial={{ scale: 0.6, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 14 }} className="grid h-24 w-24 place-items-center rounded-full bg-cherry text-on-cherry shadow-lift">
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.35, duration: 0.5 }} />
          </svg>
        </motion.div>
      </div>
      <h2 className="mt-8 font-serif text-3xl">{t.write.sentTitle}</h2>
      <p className="mt-2 max-w-[30ch] text-[15px] text-muted">{t.write.sentBody(partnerName)}</p>
      {pushLine && <p className="mt-4 max-w-[34ch] text-[13px] text-muted">{pushLine}</p>}
      <div className="mt-8 flex w-full flex-col gap-3">
        <ButtonLink href="/home">{t.write.backHome}</ButtonLink>
        <Button variant="secondary" onClick={onAnother}>{t.write.writeAnother}</Button>
        <Link href="/letters" className="text-sm text-muted underline underline-offset-4">{t.letters.title}</Link>
      </div>
    </motion.div>
  );
}
