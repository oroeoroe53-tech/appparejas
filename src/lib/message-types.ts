export const MESSAGE_TYPES = [
  "quick", "love_letter", "little_note", "heart_message", "hug_in_words", "secret_message", "old_letter",
  "thinking_of_you", "voice_note", "drawing", "hug",
] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

/** Styles offered in the Write flow (text + a chosen way of arriving). */
export const LETTER_STYLES = ["quick", "love_letter", "little_note", "heart_message", "hug_in_words", "secret_message", "old_letter"] as const;
export type LetterStyle = (typeof LETTER_STYLES)[number];

/** Styles that arrive sealed and are only revealed by an opening ceremony. The rest are readable at a glance. */
const CEREMONY: readonly MessageType[] = ["love_letter", "little_note", "heart_message", "hug_in_words", "secret_message", "old_letter"];
export const isCeremony = (type: MessageType) => CEREMONY.includes(type);

/** Keep in sync with public.send_message in the SQL migration. */
export const MESSAGE_LIMITS: Record<MessageType, number> = {
  thinking_of_you: 100,
  hug: 100,
  little_note: 280,
  voice_note: 300,
  drawing: 300,
  quick: 500,
  heart_message: 500,
  secret_message: 1500,
  hug_in_words: 1000,
  love_letter: 3000,
  old_letter: 3000,
};

export const REACTIONS = ["love", "smile", "miss", "thanks", "hug"] as const;
export type Reaction = (typeof REACTIONS)[number];

export function isMessageType(value: unknown): value is MessageType {
  return typeof value === "string" && (MESSAGE_TYPES as readonly string[]).includes(value);
}

export function isLetterStyle(value: unknown): value is LetterStyle {
  return typeof value === "string" && (LETTER_STYLES as readonly string[]).includes(value);
}
