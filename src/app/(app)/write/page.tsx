import type { Metadata } from "next";
import { Composer } from "@/components/write/Composer";
import { PageHeader } from "@/components/ui/PageHeader";
import { t } from "@/content";
import { requireSpace } from "@/server/guards";
import { partnerLabel } from "@/server/queries";

export const metadata: Metadata = { title: "Write" };
export const dynamic = "force-dynamic";

export default async function WritePage({ searchParams }: { searchParams: Promise<{ reply?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireSpace();
  const partnerName = partnerLabel(ctx.space, t.common.yourPerson);
  return (
    <>
      <PageHeader title={t.home.writeTo(partnerName)} />
      <Composer senderName={ctx.profile.display_name} partnerName={partnerName} isReply={Boolean(sp.reply)} />
    </>
  );
}
