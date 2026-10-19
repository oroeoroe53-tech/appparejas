"use client";

import { useState } from "react";
import { markReadAction } from "@/app/actions/messages";
import { MessageExperience } from "@/components/letters/MessageExperience";
import { t } from "@/content";
import type { MessageType } from "@/lib/message-types";
import { formatDateTime } from "@/lib/utils";

export interface InlineItem {
  id: string;
  type: MessageType;
  content: string;
  createdAt: string;
}

/** Unread messages that need no ceremony, shown right on Home and marked read once they have been on screen. */
export function InlineMessages({ items, senderName }: { items: InlineItem[]; senderName: string }) {
  // Keep what arrived with this visit even after the server re-renders without the now-read ones.
  const [initial] = useState(items);
  if (initial.length === 0) return null;
  return (
    <section aria-label={t.quick.newForYou} className="mt-8 space-y-3">
      <h2 className="text-xs tracking-[0.2em] text-cherry uppercase">{t.quick.newForYou}</h2>
      {initial.map((m) => (
        <MessageExperience
          key={m.id}
          type={m.type}
          text={m.content}
          senderName={senderName}
          dateLabel={formatDateTime(m.createdAt)}
          onOpened={() => void markReadAction(m.id)}
        />
      ))}
    </section>
  );
}
