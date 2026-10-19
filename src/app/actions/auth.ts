"use server";

import { redirect } from "next/navigation";
import { t } from "@/content";
import { publicEnv } from "@/lib/env";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, loginSchema, passwordSchema, registerSchema } from "@/lib/validation";
import type { FormState } from "./types";

const e = t.auth.errors;

function authErrorMessage(error: { message: string; code?: string; status?: number }): string {
  const code = error.code ?? "";
  if (code === "invalid_credentials") return e.invalidCredentials;
  if (code === "email_not_confirmed") return e.emailNotConfirmed;
  if (code === "weak_password") return e.weakPassword;
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error.status === 429) return e.rateLimited;
  return e.generic;
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: e.invalidCredentials };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error) };
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "email") return { error: e.invalidEmail };
    if (field === "password") return { error: e.weakPassword };
    return { error: String(formData.get("displayName") ?? "").trim().length > 40 ? e.nameTooLong : e.nameRequired };
  }
  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { error: authErrorMessage(error) };
  if (data.session) redirect(next);
  return { notice: t.auth.checkInbox(parsed.data.email) };
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: e.invalidEmail };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });
  if (error && (error.status === 429 || error.code === "over_email_send_rate_limit")) return { error: e.rateLimited };
  // Same answer whether or not the account exists (no account enumeration).
  return { notice: t.auth.resetSent };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: e.weakPassword };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: authErrorMessage(error) };
  redirect("/home");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/welcome");
}
