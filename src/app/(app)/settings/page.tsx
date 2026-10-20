import type { Metadata } from "next";
import { Archive, ChevronRight } from "lucide-react";
import Link from "next/link";
import { LeaveSpaceForm, DeleteAccountForm } from "@/components/settings/DangerZone";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ThemePicker } from "@/components/settings/ThemePicker";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { signOutAction } from "@/app/actions/auth";
import { t } from "@/content";
import { getAppContext, getUnreadLetters, getUser, partnerLabel } from "@/server/queries";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: t.meta.titles.settings };
export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-7 first:border-t-0">
      <h2 className="mb-4 font-serif text-xl">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const [ctx, unreadItems] = await Promise.all([getAppContext(), getUnreadLetters(user.id)]);
  if (!ctx) redirect("/login");
  const unread = ctx.space ? unreadItems.length : 0;
  const s = t.settings;
  const space = ctx.space;
  return (
    <>
      <PageHeader title={s.title} />
      <Link href="/letters" className="mb-2 flex items-center gap-4 rounded-3xl bg-paper px-5 py-4 shadow-soft transition active:scale-[0.99]">
        <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-rose-soft text-cherry">
          <Archive className="h-5 w-5" aria-hidden />
          {unread > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-cherry px-1 text-[11px] font-medium text-on-cherry">{unread}</span>}
        </span>
        <span className="flex-1">
          <span className="block font-medium">{s.lettersLink}</span>
          <span className="block text-sm text-muted">{unread > 0 ? t.a11y.unreadCount(unread) : s.lettersHint}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-stone" aria-hidden />
      </Link>
      <Section title={s.profile.title}>
        <ProfileForm displayName={ctx.profile.display_name} avatarUrl={ctx.profile.avatar_url} partnerNickname={space?.partnerNickname ?? null} hasPartner={space?.status === "active"} />
      </Section>
      <Section title={s.notifications.title}>
        <NotificationSettings enabled={ctx.preferences.notifications_enabled} previewMode={ctx.preferences.notification_preview_mode} />
      </Section>
      <Section title={s.appearance.title}>
        <ThemePicker theme={ctx.preferences.theme} />
      </Section>
      <Section title={s.install.title}>
        <p className="mb-4 text-[15px] text-muted">{s.install.body}</p>
        <Link href="/install" className="text-cherry underline underline-offset-4">{s.install.cta}</Link>
      </Section>
      <Section title={s.privacy.title}>
        <p className="text-[15px] text-muted">{s.privacy.body}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-muted">
          {s.privacy.details.map((d) => (<li key={d}>{d}</li>))}
        </ul>
      </Section>
      <Section title={s.relationship.title}>
        {space ? (
          <div className="space-y-4">
            <p className="text-[15px]">{space.partner ? s.relationship.connected(partnerLabel(space, t.common.yourPerson)) : t.connect.waitingTitle}</p>
            <LeaveSpaceForm />
          </div>
        ) : (
          <p className="text-[15px] text-muted">{s.relationship.none}</p>
        )}
      </Section>
      <Section title={s.account.title}>
        <p className="mb-4 text-sm text-muted">{s.account.signedInAs(ctx.user.email)}</p>
        <form action={signOutAction} className="mb-4"><Button type="submit" variant="secondary">{s.account.signOut}</Button></form>
        <DeleteAccountForm />
      </Section>
    </>
  );
}
