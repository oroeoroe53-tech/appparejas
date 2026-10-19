import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, className, action }: { title: string; subtitle?: string; className?: string; action?: React.ReactNode }) {
  return (
    <header className={cn("flex items-end justify-between gap-4 pb-6 pt-8", className)}>
      <div>
        <h1 className="font-serif text-[2rem] leading-tight font-normal tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
