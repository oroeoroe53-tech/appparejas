"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HandHeart, X } from "lucide-react";
import { useRef, useState } from "react";
import { sendMessageAction } from "@/app/actions/messages";
import { HugScene } from "@/components/character/HugScene";
import { t } from "@/content";
import { cn } from "@/lib/utils";

/** One tap: their phone buzzes and shows the hug, and the two of you hug on your own screen too. */
export function HugButton({ partnerName, them, me }: { partnerName: string; them: unknown; me: unknown }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [scene, setScene] = useState(false);
  const lock = useRef(false);

  async function hug() {
    if (lock.current) return;
    lock.current = true;
    setState("sending");
    setMessage(undefined);
    setScene(true);
    try {
      const res = await sendMessageAction({ content: t.hug.content, type: "hug", clientId: crypto.randomUUID() });
      if (res.ok) {
        setState("sent");
        setMessage(t.hug.sentLine);
        window.setTimeout(() => setState("idle"), 3500);
      } else {
        setScene(false);
        setState("error");
        setMessage(res.error);
      }
    } catch {
      setScene(false);
      setState("error");
      setMessage(t.hug.errors.generic);
    } finally {
      lock.current = false;
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={hug}
        disabled={state === "sending"}
        aria-label={`${t.hug.button} — ${partnerName}`}
        className={cn(
          "inline-flex min-h-12 items-center gap-2.5 rounded-full border px-6 text-[15px] font-medium transition active:scale-95",
          state === "sent" ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper text-cherry hover:border-cherry",
        )}
      >
        <HandHeart className="h-5 w-5" aria-hidden />
        {state === "sent" ? t.hug.sentLine : t.hug.button}
      </button>
      <p role={state === "error" ? "alert" : "status"} className="mt-2 min-h-5 text-xs text-muted">{state === "error" ? message : ""}</p>

      <AnimatePresence>
        {scene && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t.hug.sending_to(partnerName)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/55 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setScene(false)}
          >
            <div className="relative w-full max-w-sm rounded-[2rem] bg-cream px-5 pb-6 pt-8 text-center shadow-lift" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => setScene(false)} aria-label={t.hug.close} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-rose-soft">
                <X className="h-5 w-5" aria-hidden />
              </button>
              <HugScene them={them} me={me} label={t.hug.sending_to(partnerName)} />
              <p className="mt-3 font-serif text-2xl">{t.hug.sending_to(partnerName)}</p>
              <p className="mt-1 text-sm text-muted">{state === "sent" ? t.hug.sentLine : ""}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
