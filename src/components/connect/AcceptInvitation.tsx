"use client";

import { useState, useTransition } from "react";
import { acceptInvitationAction } from "@/app/actions/couple";
import { Button } from "@/components/ui/Button";
import { FormMessage } from "@/components/ui/Notice";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";

export function AcceptInvitation({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  return (
    <div className="space-y-4">
      <FormMessage error={error} />
      <Button
        className="w-full"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const result = await acceptInvitationAction(token);
            // On success the action redirects; we only get here with an error.
            if (result?.error) setError(result.error);
          })
        }
      >
        {pending ? (<><Spinner /> {t.connect.accepting}</>) : t.connect.accept}
      </Button>
    </div>
  );
}
