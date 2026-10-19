import type { Metadata } from "next";
import Link from "next/link";
import { AcceptInvitation } from "@/components/connect/AcceptInvitation";
import { AuthShell } from "@/components/auth/AuthShell";
import { buttonClass } from "@/components/ui/Button";
import { t } from "@/content";
import { parseInviteToken } from "@/lib/invite";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/server/queries";

export const metadata: Metadata = { title: "Join", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const token = parseInviteToken((await params).token);
  const user = await getUser();
  const next = token ? `/join/${token}` : "/home";

  if (!user) {
    return (
      <AuthShell title={t.connect.joinTitle} subtitle={t.connect.signInToJoin}>
        <div className="space-y-3">
          <Link href={`/register?next=${encodeURIComponent(next)}`} className={buttonClass("primary", "w-full")}>{t.auth.createOne}</Link>
          <Link href={`/login?next=${encodeURIComponent(next)}`} className={buttonClass("secondary", "w-full")}>{t.auth.signIn}</Link>
        </div>
      </AuthShell>
    );
  }

  let inviter: string | null = null;
  let valid = false;
  if (token) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("peek_invitation", { p_token: token });
    const row = (data as Array<{ inviter_name: string }> | null)?.[0];
    if (row) {
      valid = true;
      inviter = row.inviter_name;
    }
  }

  return (
    <AuthShell title={t.connect.joinTitle} subtitle={valid ? (inviter ? t.connect.joinBody(inviter) : t.connect.joinGeneric) : t.connect.invalidInvite}>
      {valid && token ? <AcceptInvitation token={token} /> : <Link href="/home" className={buttonClass("secondary", "w-full")}>{t.errors.goHome}</Link>}
    </AuthShell>
  );
}
