"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/content";
import { isMood } from "@/lib/character-options";
import { sanitizeCharacter } from "@/lib/character-options";
import { createClient } from "@/lib/supabase/server";

export async function saveCharacterAction(config: unknown): Promise<{ ok: boolean; error?: string }> {
  // Whatever the browser sends is reduced to the known catalogue before it reaches the database.
  const clean = sanitizeCharacter(config);
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_character", { p_config: clean });
  if (error) return { ok: false, error: t.character.errors.save };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setMoodAction(mood: string | null, note?: string): Promise<{ ok: boolean }> {
  if (mood !== null && !isMood(mood)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_mood", { p_mood: mood, p_note: note ?? null });
  if (error) return { ok: false };
  revalidatePath("/home");
  return { ok: true };
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function setTogetherSinceAction(value: string | null): Promise<{ ok: boolean; error?: string }> {
  if (value !== null && !dateSchema.safeParse(value).success) return { ok: false, error: t.us.togetherInvalid };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_together_since", { p_date: value });
  if (error) return { ok: false, error: t.us.togetherInvalid };
  revalidatePath("/", "layout");
  return { ok: true };
}
