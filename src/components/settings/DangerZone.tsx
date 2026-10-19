"use client";

import { useActionState } from "react";
import { leaveSpaceAction } from "@/app/actions/couple";
import { deleteAccountAction } from "@/app/actions/settings";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { t } from "@/content";

export function LeaveSpaceForm() {
  const [state, action] = useActionState(leaveSpaceAction, undefined);
  const r = t.settings.relationship;
  return (
    <details className="rounded-2xl border border-line p-4">
      <summary className="cursor-pointer text-[15px] font-medium text-cherry">{r.leave}</summary>
      <form action={action} className="mt-4 space-y-4" noValidate>
        <p className="text-sm text-muted">{r.leaveWarning}</p>
        <Field label={r.leaveConfirmLabel(r.leaveWord)} name="confirm" autoComplete="off" autoCapitalize="characters" error={state?.error} />
        <SubmitButton variant="danger" pendingLabel={r.leaving}>{r.leaveAction}</SubmitButton>
      </form>
    </details>
  );
}

export function DeleteAccountForm() {
  const [state, action] = useActionState(deleteAccountAction, undefined);
  const a = t.settings.account;
  return (
    <details className="rounded-2xl border border-line p-4">
      <summary className="cursor-pointer text-[15px] font-medium text-cherry">{a.delete}</summary>
      <form action={action} className="mt-4 space-y-4" noValidate>
        <p className="text-sm text-muted">{a.deleteWarning}</p>
        <Field label={a.deleteConfirmLabel(a.deleteWord)} name="confirm" autoComplete="off" autoCapitalize="characters" />
        <FormMessage error={state?.error} />
        <SubmitButton variant="danger" pendingLabel={a.deleting}>{a.deleteAction}</SubmitButton>
      </form>
    </details>
  );
}
