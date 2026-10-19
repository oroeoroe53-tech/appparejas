"use client";

import { useState } from "react";
import type { SendResult } from "@/app/actions/messages";
import { t } from "@/content";
import { cn } from "@/lib/utils";
import { Composer, SentView } from "./Composer";
import { DrawingComposer } from "./DrawingComposer";
import { VoiceComposer } from "./VoiceComposer";

type Mode = "text" | "voice" | "drawing";

/** The Write screen: a letter, a voice note or a drawing. They all end in the same confirmation. */
export function WriteHub({ spaceId, senderName, partnerName, isReply, minDate }: { spaceId: string; senderName: string; partnerName: string; isReply: boolean; minDate: string }) {
  const [mode, setMode] = useState<Mode>("text");
  const [sent, setSent] = useState<Extract<SendResult, { ok: true }> | null>(null);

  if (sent) return <SentView partnerName={partnerName} push={sent.push} onAnother={() => setSent(null)} />;

  const tabs: Array<[Mode, string]> = [["text", t.write_tabs.text], ["voice", t.voice.tab], ["drawing", t.drawing.tab]];
  return (
    <div>
      <div role="tablist" aria-label={t.write.title} className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-paper p-1 shadow-soft">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)} className={cn("min-h-11 rounded-full text-sm font-medium transition", mode === id ? "bg-cherry text-on-cherry" : "text-muted hover:text-ink")}>
            {label}
          </button>
        ))}
      </div>
      {mode === "text" && <Composer senderName={senderName} partnerName={partnerName} isReply={isReply} minDate={minDate} onSent={setSent} />}
      {mode === "voice" && <VoiceComposer spaceId={spaceId} minDate={minDate} onSent={setSent} />}
      {mode === "drawing" && <DrawingComposer spaceId={spaceId} minDate={minDate} onSent={setSent} />}
    </div>
  );
}
