import { t } from "@/content";

/** Stable error codes raised by the SQL functions (see the migration). */
export type DbErrorCode =
  | "not_authenticated"
  | "rate_limited"
  | "no_active_space"
  | "invalid_content"
  | "invalid_message_type"
  | "invalid_reaction"
  | "invalid_song"
  | "not_found"
  | "own_invitation"
  | "already_in_space"
  | "space_full"
  | "space_ended"
  | "unknown";

const KNOWN: DbErrorCode[] = [
  "not_authenticated", "rate_limited", "no_active_space", "invalid_content", "invalid_message_type",
  "invalid_song", "invalid_reaction", "not_found", "own_invitation", "already_in_space", "space_full", "space_ended",
];

export function dbErrorCode(error: { message?: string } | null | undefined): DbErrorCode {
  const message = error?.message ?? "";
  return KNOWN.find((code) => message.includes(code)) ?? "unknown";
}

export function sendErrorMessage(code: DbErrorCode | "empty" | "tooLong", max?: number): string {
  switch (code) {
    case "empty":
    case "invalid_content":
      return t.write.errors.empty;
    case "tooLong":
      return t.write.errors.tooLong(max ?? 0);
    case "no_active_space":
      return t.write.errors.noSpace;
    case "rate_limited":
      return t.write.errors.rateLimited;
    case "invalid_song":
      return t.song.errors.attach;
    default:
      return t.write.errors.generic;
  }
}
