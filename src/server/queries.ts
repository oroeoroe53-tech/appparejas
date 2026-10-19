import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isCeremony } from "@/lib/message-types";
import type { Mood } from "@/lib/character-options";
import type { Message, Preferences, Profile, SpaceContext } from "@/lib/types";

export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});

export interface AppContext {
  user: { id: string; email: string };
  profile: Profile;
  preferences: Preferences;
  space: SpaceContext | null;
}

const DEFAULT_PREFS: Preferences = { notifications_enabled: true, notification_preview_mode: "full", theme: "system" };

export const getAppContext = cache(async (): Promise<AppContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const [profileRes, prefsRes, membersRes, spaceRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("notifications_enabled, notification_preview_mode, theme").eq("user_id", user.id).maybeSingle(),
    supabase.from("couple_members").select("couple_space_id, user_id, partner_nickname, joined_at"),
    supabase.from("couple_spaces").select("id, status, together_since").maybeSingle(),
  ]);

  const profile: Profile = (profileRes.data as Profile | null) ?? {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "Me",
    avatar_url: null,
  };
  const preferences = (prefsRes.data as Preferences | null) ?? DEFAULT_PREFS;

  const members = (membersRes.data ?? []) as Array<{ couple_space_id: string; user_id: string; partner_nickname: string | null; joined_at: string }>;
  const me = members.find((m) => m.user_id === user.id);
  const other = members.find((m) => m.user_id !== user.id);
  const spaceRow = spaceRes.data as { id: string; status: SpaceContext["status"]; together_since: string | null } | null;

  let space: SpaceContext | null = null;
  if (me && spaceRow) {
    let partner: Profile | null = null;
    if (other) {
      const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").eq("id", other.user_id).maybeSingle();
      partner = (data as Profile | null) ?? null;
    }
    space = {
      id: spaceRow.id,
      status: spaceRow.status,
      joinedAt: me.joined_at,
      partnerNickname: me.partner_nickname,
      partner,
      partnerJoinedAt: other?.joined_at ?? null,
      togetherSince: spaceRow.together_since,
    };
  }
  return { user: { id: user.id, email: user.email ?? "" }, profile, preferences, space };
});

/** The name to show for the partner: my private nickname, else their display name. */
export function partnerLabel(space: SpaceContext | null, fallback: string): string {
  return space?.partnerNickname || space?.partner?.display_name || fallback;
}

export type LetterFilter = "all" | "received" | "sent";

export interface LetterListItem extends Omit<Message, "content"> {
  /** Empty for unread received letters: their text never reaches the list. */
  content: string;
  sealed: boolean;
}

export async function getLetters(
  userId: string,
  opts: { filter: LetterFilter; query: string; limit: number },
): Promise<{ items: LetterListItem[]; hasMore: boolean; error: boolean }> {
  const supabase = await createClient();
  let q = supabase.from("messages").select("*").order("sort_at", { ascending: false }).limit(opts.limit + 1);
  if (opts.filter === "received") q = q.eq("recipient_id", userId);
  if (opts.filter === "sent") q = q.eq("sender_id", userId);
  const term = opts.query.trim().slice(0, 80);
  if (term) {
    // Only letters the user wrote or has already opened are searchable, so search can't spoil surprises.
    q = q.or(`sender_id.eq.${userId},read_at.not.is.null`).ilike("content", `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  const { data, error } = await q;
  if (error) return { items: [], hasMore: false, error: true };
  const rows = (data ?? []) as Message[];
  const items = rows.slice(0, opts.limit).map<LetterListItem>((m) => {
    const sealed = isCeremony(m.message_type) && m.recipient_id === userId && m.read_at === null;
    return { ...m, content: sealed ? "" : m.content, sealed };
  });
  return { items, hasMore: rows.length > opts.limit, error: false };
}

export type UnreadItem = Pick<Message, "id" | "message_type" | "created_at" | "sender_id" | "sort_at"> & { content: string };

/** Unread messages for the recipient. Text is included only for styles that need no opening ceremony. */
export async function getUnreadLetters(userId: string): Promise<UnreadItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, message_type, created_at, sender_id, sort_at, content")
    .eq("recipient_id", userId)
    .is("read_at", null)
    .order("sort_at", { ascending: false })
    .limit(30);
  return ((data ?? []) as UnreadItem[]).map((m) => (isCeremony(m.message_type) ? { ...m, content: "" } : m));
}

export async function getLetter(id: string): Promise<Message | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("messages").select("*").eq("id", id).maybeSingle();
  return (data as Message | null) ?? null;
}

export async function getOpenInvitationExpiry(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_open_invitation");
  return (data as string | null) ?? null;
}

export interface MoodRow {
  user_id: string;
  mood: Mood;
  note: string | null;
  updated_at: string;
}

export async function getMoods(): Promise<MoodRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("moods").select("user_id, mood, note, updated_at");
  return (data ?? []) as MoodRow[];
}

/** Portraits in this space: the one I drew of my partner, and the one my partner drew of me. */
export async function getCharacters(userId: string): Promise<{ mine: unknown | null; theirs: unknown | null }> {
  const supabase = await createClient();
  const { data } = await supabase.from("characters").select("designer_id, config");
  const rows = (data ?? []) as Array<{ designer_id: string; config: unknown }>;
  return {
    mine: rows.find((r) => r.designer_id === userId)?.config ?? null,
    theirs: rows.find((r) => r.designer_id !== userId)?.config ?? null,
  };
}
