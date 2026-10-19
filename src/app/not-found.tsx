import { ButtonLink } from "@/components/ui/Button";
import { t } from "@/content";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl">{t.errors.notFoundTitle}</h1>
      <p className="mt-3 text-[15px] text-muted">{t.errors.notFoundBody}</p>
      <ButtonLink href="/" className="mt-8">{t.errors.goHome}</ButtonLink>
    </main>
  );
}
