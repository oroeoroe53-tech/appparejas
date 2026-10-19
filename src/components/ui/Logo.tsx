import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 32" className={cn("h-6 w-auto", className)} fill="none" aria-hidden="true">
      <circle cx="17" cy="16" r="11" stroke="var(--c-cherry)" strokeWidth="2.4" />
      <circle cx="31" cy="16" r="11" stroke="var(--c-rose)" strokeWidth="2.4" />
    </svg>
  );
}

export function Logo({ className, showTagline }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-none">
        <span className="font-serif text-xl font-medium tracking-tight text-ink">{brand.name}</span>
        {showTagline && <span className="mt-1 block text-[11px] tracking-[0.16em] text-muted uppercase">{brand.tagline}</span>}
      </div>
    </div>
  );
}
