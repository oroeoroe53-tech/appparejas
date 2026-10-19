import { Avatar } from "@/components/ui/Avatar";
import { t } from "@/content";
import type { Profile } from "@/lib/types";

export function ConnectionBadge({ me, partner, partnerName, since }: { me: Profile; partner: Profile | null; partnerName: string; since: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center" aria-hidden>
        <Avatar name={me.display_name} url={me.avatar_url} size={32} className="ring-2 ring-cream" />
        <span className="-mx-1 h-px w-5 bg-gradient-to-r from-cherry to-rose" />
        <Avatar name={partner?.display_name ?? partnerName} url={partner?.avatar_url} size={32} className="ring-2 ring-cream" />
      </div>
      <p className="text-[13px] leading-tight text-muted">
        <span className="block text-ink">{t.home.connectedWith(partnerName)}</span>
        {t.home.connectedSince(since)}
      </p>
    </div>
  );
}
