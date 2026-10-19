import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { RetryButton } from "@/components/RetryButton";
import { t } from "@/content";

export const metadata: Metadata = { title: t.meta.titles.offline };

export default function OfflinePage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <Logo />
      <h1 className="mt-10 font-serif text-3xl">{t.offline.title}</h1>
      <p className="mt-3 max-w-[34ch] text-[15px] text-muted">{t.offline.body}</p>
      <RetryButton label={t.offline.retry} />
    </main>
  );
}
