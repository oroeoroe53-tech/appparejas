"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/settings";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

export function ProfileForm({ displayName, avatarUrl, partnerNickname, hasPartner }: { displayName: string; avatarUrl: string | null; partnerNickname: string | null; hasPartner: boolean }) {
  const [state, action] = useActionState(updateProfileAction, undefined);
  const p = t.settings.profile;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label={p.displayName} name="displayName" defaultValue={displayName} maxLength={40} required autoComplete="given-name" />
      {hasPartner && <Field label={p.partnerNickname} name="partnerNickname" defaultValue={partnerNickname ?? ""} maxLength={40} hint={p.partnerNicknameHint} />}
      <Field label={`${p.avatarUrl} (${t.common.optional.toLowerCase()})`} name="avatarUrl" type="url" defaultValue={avatarUrl ?? ""} maxLength={500} hint={p.avatarHint} inputMode="url" autoComplete="off" />
      <FormMessage error={state?.error} notice={state?.notice} />
      <SubmitButton pendingLabel={t.common.saving} variant="secondary">{t.common.save}</SubmitButton>
    </form>
  );
}
