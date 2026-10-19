"use client";

import { HeartPulse, Send } from "lucide-react";
import { useRef, useState } from "react";
import { sendMessageAction } from "@/app/actions/messages";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { MESSAGE_LIMITS } from "@/lib/message-types";
import { useOnline } from "@/lib/use-client";
import { cn } from "@/lib/utils";

const LIMIT = MESSAGE_LIMITS.quick;

/** The heart of the product: write a line, send, and it lands on their lock screen. */
export function QuickSend({ partnerName }: { partnerName: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();
  const [info, setInfo] = useState<string>();
  const clientId = useRef<string>(crypto.randomUUID());
  const lock = useRef(false);
  const online = useOnline();
  const length = Array.from(text).length;
  const empty = text.trim().length === 0;

  async function send() {
    if (lock.current || empty || length > LIMIT) return;
    if (!navigator.onLine) {
      setError(t.quick.offline);
      return;
    }
    lock.current = true;
    setSending(true);
    setError(undefined);
    setInfo(undefined);
    try {
      const res = await sendMessageAction({ content: text, type: "quick", clientId: clientId.current });
      if (res.ok) {
        setText("");
        clientId.current = crypto.randomUUID();
        setInfo(res.push === "sent" ? t.quick.sentLine : t.write.pushSkipped);
        window.setTimeout(() => setInfo(undefined), 5000);
      } else setError(res.error);
    } catch {
      // The same clientId is kept, so retrying can never create a duplicate.
      setError(t.write.errors.generic);
    } finally {
      lock.current = false;
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
      aria-label={t.quick.label(partnerName)}
    >
      <div className="flex items-end gap-2 rounded-[1.6rem] border border-line bg-paper p-2 pl-4 shadow-soft focus-within:border-cherry focus-within:ring-2 focus-within:ring-cherry/25">
        <label htmlFor="quick-text" className="sr-only">{t.quick.label(partnerName)}</label>
        <textarea
          id="quick-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={t.quick.placeholder(partnerName)}
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent py-2.5 text-base leading-snug placeholder:text-stone focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || empty || length > LIMIT || !online}
          aria-label={sending ? t.quick.sending : t.quick.send}
          aria-busy={sending}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cherry text-on-cherry shadow-soft transition active:scale-95 disabled:opacity-45"
        >
          {sending ? <Spinner className="h-5 w-5" /> : <Send className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      <div className="mt-2 flex min-h-5 items-center justify-between px-3 text-xs">
        <p role={error ? "alert" : "status"} className={cn(error ? "text-cherry" : "text-muted")}>
          {error ?? info ?? (!online ? t.quick.offline : "")}
        </p>
        {length > LIMIT * 0.8 && <span className={length > LIMIT ? "text-cherry" : "text-muted"}>{t.write.counter(length, LIMIT)}</span>}
      </div>
    </form>
  );
}

export function PingButton({ partnerName }: { partnerName: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const lock = useRef(false);

  async function ping() {
    if (lock.current) return;
    lock.current = true;
    setState("sending");
    setMessage(undefined);
    try {
      if ("vibrate" in navigator) navigator.vibrate(18);
      const res = await sendMessageAction({ content: t.ping.content, type: "thinking_of_you", clientId: crypto.randomUUID() });
      if (res.ok) {
        setState("sent");
        setMessage(t.ping.sentLine);
        window.setTimeout(() => setState("idle"), 3500);
      } else {
        setState("error");
        setMessage(res.error);
      }
    } catch {
      setState("error");
      setMessage(t.ping.errors.generic);
    } finally {
      lock.current = false;
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={ping}
        disabled={state === "sending"}
        aria-label={`${t.ping.button} — ${partnerName}`}
        className={cn(
          "inline-flex min-h-12 items-center gap-2.5 rounded-full border px-6 text-[15px] font-medium transition active:scale-95",
          state === "sent" ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper text-cherry hover:border-cherry",
        )}
      >
        <HeartPulse className={cn("h-5 w-5", state === "sent" && "animate-heartbeat")} aria-hidden />
        {state === "sent" ? t.ping.sentLine : t.ping.button}
      </button>
      <p role={state === "error" ? "alert" : "status"} className="mt-2 min-h-5 text-xs text-muted">{state === "error" ? message : ""}</p>
    </div>
  );
}
