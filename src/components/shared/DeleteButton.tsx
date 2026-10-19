"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { t } from "@/content";

/** Delete with an inline "are you sure?" step, so a stray tap never removes something precious. */
export function DeleteButton({ action, id, label, confirmLabel }: { action: (id: string) => Promise<{ ok: boolean }>; id: string; label: string; confirmLabel: string }) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();
  if (asking) {
    return (
      <span role="alertdialog" aria-label={confirmLabel} className="flex items-center gap-2 text-xs">
        <span>{confirmLabel}</span>
        <button type="button" disabled={pending} onClick={() => start(async () => { await action(id); setAsking(false); })} className="rounded-full bg-cherry px-3 py-1.5 text-on-cherry">{label}</button>
        <button type="button" onClick={() => setAsking(false)} className="rounded-full border border-line px-3 py-1.5">{t.common.cancel}</button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setAsking(true)} aria-label={label} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-rose-soft hover:text-cherry">
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
