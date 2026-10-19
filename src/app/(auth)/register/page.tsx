import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/forms";
import { t } from "@/content";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const dest = safeNext((await searchParams).next);
  return (
    <AuthShell
      title={t.auth.registerTitle}
      subtitle={t.auth.registerSubtitle}
      footer={
        <>
          {t.auth.haveAccount}{" "}
          <Link href={`/login?next=${encodeURIComponent(dest)}`} className="text-cherry underline underline-offset-4">{t.auth.signIn}</Link>
        </>
      }
    >
      {dest.startsWith("/join/") && <p className="mb-5 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.auth.invitedBanner}</p>}
      <RegisterForm next={dest} />
    </AuthShell>
  );
}
