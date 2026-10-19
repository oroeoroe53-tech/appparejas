import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/forms";
import { t } from "@/content";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: t.meta.titles.login };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const dest = safeNext(next);
  return (
    <AuthShell
      title={t.auth.loginTitle}
      subtitle={t.auth.loginSubtitle}
      footer={
        <>
          {t.auth.noAccount}{" "}
          <Link href={`/register?next=${encodeURIComponent(dest)}`} className="text-cherry underline underline-offset-4">{t.auth.createOne}</Link>
        </>
      }
    >
      {dest.startsWith("/join/") && <p className="mb-5 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.auth.invitedBanner}</p>}
      {error === "link" && <p role="alert" className="mb-5 rounded-2xl bg-rose-soft px-4 py-3 text-sm text-cherry-deep">{t.auth.errors.linkExpired}</p>}
      <LoginForm next={dest} />
    </AuthShell>
  );
}
