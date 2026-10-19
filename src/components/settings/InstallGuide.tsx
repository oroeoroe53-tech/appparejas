"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { t } from "@/content";
import { isIos, isStandalone } from "@/lib/push-client";
import { useBrowserValue } from "@/lib/use-client";
import { cn } from "@/lib/utils";

type Platform = "ios" | "android" | "desktop";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function detectPlatform(): Platform {
  return isIos() ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "desktop";
}

export function InstallGuide() {
  const detected = useBrowserValue<Platform | "">(detectPlatform, "");
  const standalone = useBrowserValue(isStandalone, false);
  const [chosen, setChosen] = useState<Platform | null>(null);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const platform: Platform = chosen ?? (detected || "desktop");

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const i = t.install;
  if (standalone) {
    return (
      <div className="rounded-3xl bg-paper p-6 shadow-soft" role="status">
        <h2 className="font-serif text-xl">{i.installedTitle}</h2>
        <p className="mt-2 text-[15px] text-muted">{i.installedBody}</p>
      </div>
    );
  }
  const steps = i[platform];
  return (
    <div className="space-y-6">
      {detected && <p className="text-sm text-muted">{i.detected(i.platforms[detected])}</p>}
      <div role="tablist" aria-label="Platform" className="flex gap-2">
        {(Object.keys(i.platforms) as Platform[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={platform === p}
            onClick={() => setChosen(p)}
            className={cn("min-h-10 flex-1 rounded-full border px-2 text-[13px] transition", platform === p ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper")}
          >
            {i.platforms[p]}
          </button>
        ))}
      </div>
      {prompt && (
        <Button onClick={() => prompt.prompt().finally(() => setPrompt(null))} className="w-full">{i.installPrompt}</Button>
      )}
      <ol className="space-y-4" role="tabpanel">
        {steps.map((step, idx) => (
          <li key={step} className="flex gap-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-soft font-serif text-cherry">{idx + 1}</span>
            <p className="pt-1 text-[15px] leading-relaxed">{step}</p>
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border border-line p-4">
        <h2 className="font-serif text-lg">{i.limitsTitle}</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted">
          {i.limits.map((l) => (<li key={l}>{l}</li>))}
        </ul>
      </div>
    </div>
  );
}
