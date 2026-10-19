import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/forms";
import { t } from "@/content";

export const metadata: Metadata = { title: t.meta.titles.newPassword };

// Reachable only with the temporary session created by the emailed recovery link (the proxy requires a session).
export default function ResetPage() {
  return (
    <AuthShell title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle}>
      <ResetForm />
    </AuthShell>
  );
}
