import { redirect } from "next/navigation";
import { AppEffects } from "@/components/AppEffects";
import { BottomNav } from "@/components/BottomNav";
import { getAppContext, getUnreadLetters, getUser } from "@/server/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect("/login");
  // Both need only the user id, so they travel together instead of one after the other.
  const [ctx, unreadItems] = await Promise.all([getAppContext(), getUnreadLetters(user.id)]);
  if (!ctx) redirect("/login");
  const unread = ctx.space ? unreadItems.length : 0;
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
