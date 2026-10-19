"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/content";
import { dbErrorCode } from "@/lib/errors";
import { LETTER_STYLES } from "@/lib/message-types";
import { createClient } from "@/lib/supabase/server";
import { pushEvent } from "@/server/notify";
import { getAppContext } from "@/server/queries";
import type { FormState } from "./types";

const uuid = z.string().uuid();

export async function addReasonAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.string().trim().min(1).max(200).safeParse(formData.get("content"));
  if (!parsed.success) return { error: t.jar.errors.empty };
  const supabase = await createClient();
  const { error } = await supabase.from("reasons").insert({ content: parsed.data });
  if (error) return { error: t.jar.errors.generic };
  revalidatePath("/us/jar");
  revalidatePath("/home");
  return { notice: t.common.saved };
}

export async function deleteReasonAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("reasons").delete().eq("id", id);
  revalidatePath("/us/jar");
  revalidatePath("/home");
  return { ok: !error };
}

const OPEN_STYLES = LETTER_STYLES.filter((s) => s !== "quick");
const openWhenSchema = z.object({
  label: z.string().trim().min(1, "label").max(60),
  content: z.string().trim().min(1, "text").max(3000),
  style: z.enum(OPEN_STYLES as [string, ...string[]]),
});

export async function writeOpenWhenAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = openWhenSchema.safeParse({ label: formData.get("label"), content: formData.get("content"), style: formData.get("style") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message === "label" ? t.openWhen.errors.label : t.openWhen.errors.text };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("write_open_when", { p_label: parsed.data.label, p_content: parsed.data.content, p_style: parsed.data.style });
  if (error) return { error: dbErrorCode(error) === "rate_limited" ? t.write.errors.rateLimited : t.openWhen.errors.generic };
  revalidatePath("/us/open-when");
  return { notice: t.common.saved };
}

/** Unlocks a letter for its recipient and lets the author know it was opened. */
export async function openOpenWhenAction(id: string): Promise<{ ok: true; content: string; style: string; label: string } | { ok: false; error: string }> {
  if (!uuid.safeParse(id).success) return { ok: false, error: t.openWhen.errors.generic };
  const ctx = await getAppContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_open_when", { p_id: id });
  if (error || !data) return { ok: false, error: t.openWhen.errors.generic };
  const letter = data as { author_id: string; label: string; style: string; content: string };
  if (ctx) {
    await pushEvent({
      fromUserId: ctx.user.id,
      toUserId: letter.author_id,
      tag: `open-when-${id}`,
      url: "/us/open-when",
      fullBody: (name) => t.openWhen.pushOpened(name, letter.label),
      genericBody: t.openWhen.pushOpenedGeneric,
    });
  }
  revalidatePath("/us/open-when");
  return { ok: true, content: letter.content, style: letter.style, label: letter.label };
}

export async function deleteOpenWhenAction(id: string): Promise<{ ok: boolean }> {
  if (!uuid.safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_open_when", { p_id: id });
  revalidatePath("/us/open-when");
  return { ok: !error };
}

export async function setTimezoneAction(tz: string): Promise<{ ok: boolean }> {
  if (!/^[A-Za-z0-9_+/-]{1,64}$/.test(tz)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_timezone", { p_tz: tz });
  if (!error) revalidatePath("/", "layout");
  return { ok: !error };
}
