import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/forms";
import { t } from "@/content";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <AuthShell
      title={t.auth.forgotTitle}
      subtitle={t.auth.forgotSubtitle}
      footer={<Link href="/login" className="text-cherry underline underline-offset-4">{t.auth.backToSignIn}</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
