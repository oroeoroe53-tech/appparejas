import { redirect } from "next/navigation";
import { t } from "@/content";
import { isSupabaseConfigured, missingEnvVars } from "@/lib/env";

export default function SetupPage() {
  if (isSupabaseConfigured()) redirect("/");
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="font-serif text-3xl">{t.setup.title}</h1>
      <p className="mt-3 text-[15px] text-muted">{t.setup.body}</p>
      <h2 className="mt-8 text-xs tracking-widest text-muted uppercase">{t.setup.missing}</h2>
      <ul className="mt-3 space-y-2 font-mono text-sm">
        {missingEnvVars().map((name) => (
          <li key={name} className="rounded-xl bg-paper px-3 py-2 shadow-soft">{name}</li>
        ))}
      </ul>
    </main>
  );
}
