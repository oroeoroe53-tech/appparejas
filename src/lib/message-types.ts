export const MESSAGE_TYPES = ["love_letter", "little_note", "heart_message", "hug_in_words", "secret_message"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** Keep in sync with public.send_message in the SQL migration. */
export const MESSAGE_LIMITS: Record<MessageType, number> = {
  little_note: 280,
  heart_message: 500,
  secret_message: 1500,
  hug_in_words: 1000,
  love_letter: 3000,
};

export const REACTIONS = ["love", "smile", "miss", "thanks", "hug"] as const;
export type Reaction = (typeof REACTIONS)[number];

export function isMessageType(value: unknown): value is MessageType {
  return typeof value === "string" && (MESSAGE_TYPES as readonly string[]).includes(value);
}
