"use client";

import { Share2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { createInvitationAction, goToJoinAction, revokeInvitationAction, type InviteResult } from "@/app/actions/couple";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Spinner } from "@/components/ui/Spinner";
import { brand } from "@/config/brand";
import { t } from "@/content";
import { formatDateTime } from "@/lib/utils";

export function InvitePanel({ openInviteExpiry }: { openInviteExpiry: string | null }) {
  const [pending, start] = useTransition();
  const [invite, setInvite] = useState<Extract<InviteResult, { ok: true }> | null>(null);
  const [error, setError] = useState<string>();
  const [revoked, setRevoked] = useState(false);
  const hasOpen = !revoked && (invite !== null || openInviteExpiry !== null);
  const expiry = invite?.expiresAt ?? openInviteExpiry;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const create = () =>
    start(async () => {
      setError(undefined);
      const result = await createInvitationAction();
      if (result.ok) {
        setInvite(result);
        setRevoked(false);
      } else setError(result.error);
    });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-paper p-6 shadow-soft">
        <h2 className="font-serif text-xl">{t.connect.waitingTitle}</h2>
        <p className="mt-2 text-[15px] text-muted">{t.connect.waitingBody}</p>

        {invite && !revoked ? (
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">{t.connect.linkLabel}</p>
              <p className="mt-1.5 break-all rounded-xl bg-cream px-3 py-2.5 font-mono text-[13px] select-all">{invite.url}</p>
            </div>
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">{t.connect.codeLabel}</p>
              <p className="mt-1.5 break-all rounded-xl bg-cream px-3 py-2.5 font-mono text-[13px] select-all">{invite.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={invite.url} label={t.connect.copyLink} variant="primary" />
              <CopyButton value={invite.code} label={t.connect.copyCode} />
              {canShare && (
                <Button
                  variant="secondary"
                  className="min-h-11 px-4"
                  onClick={() => navigator.share({ title: brand.name, text: t.connect.shareText(brand.name), url: invite.url }).catch(() => undefined)}
                >
                  <Share2 className="h-4 w-4" aria-hidden /> {t.connect.share}
                </Button>
              )}
            </div>
          </div>
        ) : hasOpen ? (
          <p className="mt-5 rounded-2xl bg-cream px-4 py-3 text-sm text-muted">{t.connect.activeInviteNote}</p>
        ) : null}

        {expiry && hasOpen && <p className="mt-4 text-sm text-muted">{t.connect.expiresIn(formatDateTime(expiry))}</p>}
        <FormMessage error={error} className="mt-4" />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button onClick={create} disabled={pending} aria-busy={pending} variant={hasOpen ? "secondary" : "primary"}>
            {pending ? (<><Spinner /> {t.connect.creating}</>) : hasOpen ? t.connect.newInvite : t.connect.createInvite}
          </Button>
          {hasOpen && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await revokeInvitationAction();
                  if (r.ok) {
                    setRevoked(true);
                    setInvite(null);
                  } else setError(t.settings.errors.generic);
                })
              }
            >
              {t.connect.revoke}
            </Button>
          )}
        </div>
        {hasOpen && <p className="mt-3 text-[13px] text-muted">{t.connect.newInviteHint}</p>}
      </div>
      <JoinWithCode />
    </div>
  );
}

export function JoinWithCode() {
  const [state, action] = useActionState(goToJoinAction, undefined);
  return (
    <form action={action} className="rounded-3xl border border-line p-6" noValidate>
      <h2 className="font-serif text-lg">{t.connect.haveCodeTitle}</h2>
      <p className="mt-1.5 text-[15px] text-muted">{t.connect.haveCodeBody}</p>
      <Field label={t.connect.codeLabel} name="code" placeholder={t.connect.codePlaceholder} autoComplete="off" autoCapitalize="none" spellCheck={false} error={state?.error} className="mt-4" />
      <SubmitButton variant="secondary" pendingLabel={t.common.loading} className="mt-4">{t.connect.join}</SubmitButton>
    </form>
  );
}
