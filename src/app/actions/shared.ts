"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { t } from "@/content";
import { dbErrorCode } from "@/lib/errors";
import { isMediaPath } from "@/lib/media";
import { removeMyFiles } from "@/server/media";
import { createClient } from "@/lib/supabase/server";
import { pushEvent } from "@/server/notify";
import { getAppContext } from "@/server/queries";
import type { FormState } from "./types";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : null));

const eventSchema = z.object({
  title: z.string().trim().min(1, "title").max(80),
  note: optionalText(300),
  date: dateField,
  kind: z.enum(["plan", "anniversary", "birthday"]),
  yearly: z.boolean(),
});

export async function addEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    note: formData.get("note") ?? undefined,
    date: formData.get("date"),
    kind: formData.get("kind"),
    yearly: formData.get("yearly") === "on",
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "date" ? t.plans.errors.date : field === "title" ? t.plans.errors.title : t.plans.errors.generic };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("couple_events").insert({
    title: parsed.data.title,
    note: parsed.data.note,
    event_date: parsed.data.date,
    kind: parsed.data.kind,
    repeat_yearly: parsed.data.yearly || parsed.data.kind === "anniversary" || parsed.data.kind === "birthday",
  });
  if (error) return { error: t.plans.errors.generic };
  revalidatePath("/us/plans");
  revalidatePath("/home");
  return { notice: t.common.saved };
}

export async function deleteEventAction(id: string): Promise<{ ok: boolean }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("couple_events").delete().eq("id", id);
  revalidatePath("/us/plans");
  revalidatePath("/home");
  return { ok: !error };
}

const storySchema = z.object({
  title: z.string().trim().min(1, "title").max(100),
  note: optionalText(1000),
  date: dateField,
});

export async function addStoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = storySchema.safeParse({ title: formData.get("title"), note: formData.get("note") ?? undefined, date: formData.get("date") });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "date" ? t.story.errors.date : field === "title" ? t.story.errors.title : t.story.errors.generic };
  }
  const ctx = await getAppContext();
  const rawPhoto = String(formData.get("photoPath") ?? "");
  const photoPath = rawPhoto && ctx?.space && isMediaPath(rawPhoto, ctx.space.id, "story") ? rawPhoto : null;
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_entries").insert({ title: parsed.data.title, note: parsed.data.note, happened_on: parsed.data.date, photo_path: photoPath });
  if (error) {
    if (photoPath) await removeMyFiles([photoPath]).catch(() => undefined);
    return { error: t.story.errors.generic };
  }
  revalidatePath("/us/story");
  return { notice: t.common.saved };
}

export async function deleteStoryAction(id: string): Promise<{ ok: boolean }> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false };
  const supabase = await createClient();
  const { data: entry } = await supabase.from("timeline_entries").select("photo_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("timeline_entries").delete().eq("id", id);
  const photo = (entry as { photo_path: string | null } | null)?.photo_path;
  if (!error && photo) await removeMyFiles([photo]).catch(() => undefined);
  revalidatePath("/us/story");
  return { ok: !error };
}

export async function answerQuestionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const answer = String(formData.get("answer") ?? "").trim();
  if (!answer) return { error: t.question.errors.empty };
  if (Array.from(answer).length > 500) return { error: t.question.errors.generic };
  const ctx = await getAppContext();
  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_question", { p_answer: answer });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("already_answered")) return { error: t.question.errors.already };
    return { error: dbErrorCode(error) === "rate_limited" ? t.write.errors.rateLimited : t.question.errors.generic };
  }
  if (ctx?.space?.partner) {
    await pushEvent({
      fromUserId: ctx.user.id,
      toUserId: ctx.space.partner.id,
      tag: `question-${new Date().toISOString().slice(0, 10)}`,
      url: "/us/questions",
      fullBody: (name) => t.question.pushBody(name),
      genericBody: t.question.pushGeneric,
    });
  }
  revalidatePath("/home");
  revalidatePath("/us/questions");
  return { notice: t.common.saved };
}
