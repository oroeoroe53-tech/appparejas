import type { MessageType, Reaction } from "./message-types";

export type SpaceStatus = "waiting" | "active" | "ended";
export type PreviewMode = "generic" | "full";
export type ThemePreference = "system" | "light" | "dark";
export type PushStatus = "pending" | "sent" | "failed" | "skipped";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Preferences {
  notifications_enabled: boolean;
  notification_preview_mode: PreviewMode;
  theme: ThemePreference;
}

export interface Message {
  id: string;
  couple_space_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  read_at: string | null;
  reaction: Reaction | null;
  reacted_at: string | null;
  push_status: PushStatus;
  song_track_id: string | null;
  song_title: string | null;
  song_artist: string | null;
  song_preview_url: string | null;
  song_artwork_url: string | null;
  song_start: number | null;
  song_duration: number | null;
  attachment_path: string | null;
  attachment_seconds: number | null;
  deliver_at: string | null;
  sort_at: string;
}

export interface SpaceContext {
  id: string;
  status: SpaceStatus;
  joinedAt: string;
  /** What I call my person (my own private label). */
  partnerNickname: string | null;
  partner: Profile | null;
  partnerJoinedAt: string | null;
}
