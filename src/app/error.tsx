"use client";

import { Button } from "@/components/ui/Button";
import { t } from "@/content";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">{t.errors.title}</h1>
      <p className="mt-3 text-[15px] text-muted">{t.errors.body}</p>
      <Button className="mt-8" onClick={reset}>{t.common.tryAgain}</Button>
    </main>
  );
}
