import { t } from "@/content";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, url, size = 40, className }: { name: string; url?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={t.a11y.avatarOf(name)} width={size} height={size} referrerPolicy="no-referrer" style={style} className={cn("rounded-full object-cover", className)} />;
  }
  return (
    <span
      role="img"
      aria-label={t.a11y.avatarOf(name)}
      style={style}
      className={cn("inline-flex items-center justify-center rounded-full bg-rose-soft font-serif text-cherry", className)}
    >
      {initials(name)}
    </span>
  );
}
