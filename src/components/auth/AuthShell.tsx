import { t } from "@/content";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main id="main" className="safe-top safe-bottom mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 py-8">
      <Link href="/welcome" aria-label={t.meta.homeLink} className="self-start">
        <Logo />
      </Link>
      <div className="flex flex-1 flex-col justify-center py-10">
        <h1 className="font-serif text-[2.1rem] leading-tight tracking-tight">{title}</h1>
        <p className="mt-2 text-[15px] text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </div>
      {footer && <div className="text-center text-sm text-muted">{footer}</div>}
    </main>
  );
}
