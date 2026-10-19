"use client";

import { useState, useTransition } from "react";
import { updatePreferencesAction } from "@/app/actions/settings";
import { t } from "@/content";
import type { ThemePreference } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: ThemePreference[] = ["system", "light", "dark"];

export function ThemePicker({ theme: initial }: { theme: ThemePreference }) {
  const [theme, setTheme] = useState(initial);
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label={t.settings.appearance.theme} className="flex gap-2">
      {OPTIONS.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={theme === o}
          onClick={() => {
            const previous = theme;
            setTheme(o);
            start(async () => {
              const res = await updatePreferencesAction({ theme: o });
              if (!res.ok) setTheme(previous);
            });
          }}
          className={cn("min-h-11 flex-1 rounded-full border px-3 text-sm transition", theme === o ? "border-cherry bg-cherry text-on-cherry" : "border-line bg-paper hover:border-stone")}
        >
          {t.settings.appearance[o]}
        </button>
      ))}
    </div>
  );
}
