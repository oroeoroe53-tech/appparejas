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
  /** Big picture (Android Chrome shows it; iOS ignores it). Only ever set by the server, only in full mode. */
  image?: string;
}

export const PREVIEW_MAX_CHARS = 140;

const ICONS = { icon: "/icons/icon-192.png", badge: "/icons/badge-96.png" };

/**
 * Builds what the lock screen shows. In "generic" mode NOTHING from the message
 * (not even the sender's name) is included. In "full" mode the title is the sender's name
 * (as the recipient calls them) and the body is the text itself.
 */
export function buildMessagePayload(input: {
  messageId: string;
  type: MessageType;
  senderName: string;
  content: string;
  previewMode: PreviewMode;
  /** Short-lived signed link to a drawing, shown as the notification picture in full mode. */
  imageUrl?: string;
}): PushPayload {
  const base = { ...ICONS, tag: `message-${input.messageId}`, url: `/letters/${input.messageId}` };
  if (input.previewMode === "generic") {
    return { ...base, title: brand.name, body: t.types[input.type].notification };
  }
  let body: string;
  switch (input.type) {
    case "thinking_of_you":
      body = t.ping.pushBody;
      break;
    case "voice_note":
      body = t.quick.pushBodyVoice;
      break;
    case "drawing":
      body = t.quick.pushBodyDrawing;
      break;
    default:
      body = truncate(input.content, PREVIEW_MAX_CHARS);
  }
  const image = input.type === "drawing" && input.imageUrl?.startsWith("https://") ? { image: input.imageUrl } : {};
  return { ...base, ...image, title: input.senderName || brand.name, body };
}

/** For gifts, reminders and other non-message events. Respects the same privacy choice. */
export function buildEventPayload(input: {
  tag: string;
  url: string;
  previewMode: PreviewMode;
  fullTitle: string;
  fullBody: string;
  genericBody: string;
}): PushPayload {
  return input.previewMode === "full"
    ? { ...ICONS, tag: input.tag, url: input.url, title: input.fullTitle, body: input.fullBody }
    : { ...ICONS, tag: input.tag, url: input.url, title: brand.name, body: input.genericBody };
}

export function buildTestPayload(): PushPayload {
  return {
    ...ICONS,
    title: brand.name,
    body: "This is a test. Notifications are working on this device.",
    tag: "test-notification",
    url: "/settings",
  };
}
