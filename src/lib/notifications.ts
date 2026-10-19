import { t } from "@/content";
import { brand } from "@/config/brand";
import type { MessageType } from "./message-types";
import type { PreviewMode } from "./types";
import { truncate } from "./utils";

export interface PushPayload {
  title: string;
  body: string;
  /** One tag per message: the OS replaces instead of stacking duplicates. */
  tag: string;
  /** Where the notification opens. Authentication is enforced by the app, not the payload. */
  url: string;
  icon: string;
  badge: string;
}

export const PREVIEW_MAX_CHARS = 90;

/**
 * Builds what the lock screen shows. In "generic" mode NOTHING from the message
 * (not even the sender's name) is included.
 */
export function buildMessagePayload(input: {
  messageId: string;
  type: MessageType;
  senderName: string;
  content: string;
  previewMode: PreviewMode;
}): PushPayload {
  const base = {
    tag: `message-${input.messageId}`,
    url: `/letters/${input.messageId}`,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
  };
  if (input.previewMode === "full") {
    return { ...base, title: input.senderName, body: truncate(input.content, PREVIEW_MAX_CHARS) };
  }
  return { ...base, title: brand.name, body: t.types[input.type].notification };
}

export function buildTestPayload(): PushPayload {
  return {
    title: brand.name,
    body: "This is a test. Notifications are working on this device.",
    tag: "test-notification",
    url: "/settings",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
  };
}
