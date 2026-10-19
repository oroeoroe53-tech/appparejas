"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, registerAction, updatePasswordAction } from "@/app/actions/auth";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={t.auth.email} name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field label={t.auth.password} name="password" type="password" autoComplete="current-password" required />
      <FormMessage error={state?.error} />
      <SubmitButton pendingLabel={t.auth.signingIn} className="w-full">{t.auth.signIn}</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-cherry underline underline-offset-4">{t.auth.forgot}</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  if (state?.notice) {
    return (
      <div className="space-y-3 rounded-3xl bg-paper p-6 shadow-soft" role="status">
        <h2 className="font-serif text-xl">{t.auth.checkInboxTitle}</h2>
        <p className="text-[15px] text-muted">{state.notice}</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={t.auth.displayName} name="displayName" autoComplete="given-name" maxLength={40} hint={t.auth.displayNameHint} required />
      <Field label={t.auth.email} name="email" type="email" autoComplete="email" inputMode="email" required />
      <Field label={t.auth.password} name="password" type="password" autoComplete="new-password" minLength={8} hint={t.auth.errors.weakPassword} required />
      <FormMessage error={state?.error} />
      <SubmitButton pendingLabel={t.auth.signingUp} className="w-full">{t.auth.signUp}</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={t.auth.email} name="email" type="email" autoComplete="email" inputMode="email" required />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.auth.sendingLink} className="w-full">{t.auth.sendLink}</SubmitButton>
    </form>
  );
}

export function ResetForm() {
  const [state, action] = useActionState(updatePasswordAction, undefined);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={t.auth.newPassword} name="password" type="password" autoComplete="new-password" minLength={8} required />
      <FormMessage error={state?.error} />
      <SubmitButton pendingLabel={t.auth.updatingPassword} className="w-full">{t.auth.updatePassword}</SubmitButton>
    </form>
  );
}
