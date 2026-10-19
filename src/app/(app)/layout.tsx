import { redirect } from "next/navigation";
import { AppEffects } from "@/components/AppEffects";
import { BottomNav } from "@/components/BottomNav";
import { getAppContext, getUnreadLetters } from "@/server/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getAppContext();
  if (!ctx) redirect("/login");
  const unread = ctx.space ? (await getUnreadLetters(ctx.user.id)).length : 0;
  return (
    <>
      <AppEffects theme={ctx.preferences.theme} pushWanted={ctx.preferences.notifications_enabled} unread={unread} timezone={ctx.profile.timezone ?? null} />
      <div id="main" className="safe-top mx-auto w-full max-w-md px-5 pb-32">
        {children}
      </div>
      <BottomNav unread={unread} />
    </>
  );
}
