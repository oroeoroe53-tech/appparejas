import Link from "next/link";
import { cn } from "@/lib/utils";

/** Each section of the app has its own soft colour so the Us screen reads like a set of little rooms. */
export const ACCENTS = {
  rose: "#e9b8b8",
  peach: "#f3c9a8",
  sand: "#ead7a0",
  sage: "#bfd8b4",
  sky: "#b8d4e6",
  lavender: "#d3c3ea",
} as const;

export type Accent = keyof typeof ACCENTS;

export function HubTile({
  href, title, preview, Icon, accent, wide, badge, children,
}: {
  href: string;
  title: string;
  preview: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  accent: Accent;
  wide?: boolean;
  badge?: string | null;
  children?: React.ReactNode;
}) {
  const color = ACCENTS[accent];
  return (
    <Link
      href={href}
      className={cn("group relative flex min-h-[8.5rem] flex-col justify-between overflow-hidden rounded-3xl p-4 shadow-soft transition active:scale-[0.98]", wide && "col-span-2")}
      style={{ background: `color-mix(in srgb, ${color} 26%, var(--c-paper))` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-60 blur-xl" style={{ background: color }} />
      <div className="relative flex items-start justify-between gap-2">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-ink" style={{ background: `color-mix(in srgb, ${color} 55%, var(--c-paper))` }}>
          <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
        </span>
        {badge && <span className="rounded-full bg-cherry px-2.5 py-1 text-[11px] font-medium text-on-cherry">{badge}</span>}
      </div>
      {children}
      <div className="relative mt-3">
        <p className="font-serif text-[1.15rem] leading-tight">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">{preview}</p>
      </div>
    </Link>
  );
}
