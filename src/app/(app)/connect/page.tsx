import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InvitePanel } from "@/components/connect/InvitePanel";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { getAppContext, getOpenInvitationExpiry } from "@/server/queries";

export const metadata: Metadata = { title: "Invite your person" };
export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  if (ctx.space?.status === "active") redirect("/home");

  if (ctx.space?.status === "ended") {
    return (
      <>
        <PageHeader title={t.connect.endedTitle} />
        <p className="text-[15px] leading-relaxed text-muted">{t.connect.endedBody}</p>
        <div className="mt-6 flex flex-col gap-3">
          <ButtonLink href="/letters">{t.nav.letters}</ButtonLink>
          <ButtonLink href="/settings" variant="secondary">{t.connect.goToSettings}</ButtonLink>
        </div>
      </>
    );
  }

  const expiry = ctx.space ? await getOpenInvitationExpiry() : null;
  return (
    <>
      <PageHeader title={t.connect.title} subtitle={t.connect.subtitle} />
      <InvitePanel openInviteExpiry={expiry} />
    </>
  );
}
