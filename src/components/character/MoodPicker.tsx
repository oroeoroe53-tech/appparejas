"use client";

import { CloudLightning, CloudRain, Heart, Leaf, Moon, Smile, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { setMoodAction } from "@/app/actions/us";
import { t } from "@/content";
import { MOODS, type Mood } from "@/lib/character-options";
import { cn } from "@/lib/utils";

export const MOOD_ICONS: Record<Mood, React.ComponentType<{ className?: string }>> = {
  happy: Smile,
  loved: Heart,
  calm: Leaf,
  excited: Sparkles,
  tired: Moon,
  sad: CloudRain,
  stressed: CloudLightning,
};

export function MoodPicker({ current }: { current: Mood | null }) {
  const [mood, setMood] = useState<Mood | null>(current);
  const [error, setError] = useState<string>();
  const [, start] = useTransition();

  function choose(next: Mood | null) {
    const previous = mood;
    setMood(next);
    setError(undefined);
    start(async () => {
      const res = await setMoodAction(next);
      if (!res.ok) {
        setMood(previous);
        setError(t.mood.errors.save);
      }
    });
  }

  return (
    <section aria-label={t.mood.title} className="rounded-3xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-medium">{t.mood.title}</h2>
        {mood && (
          <button type="button" onClick={() => choose(null)} className="text-xs text-muted underline underline-offset-4">
            {t.mood.clear}
          </button>
        )}
      </div>
      <p className="mt-0.5 text-[13px] text-muted">{t.mood.hint}</p>
      <div role="radiogroup" aria-label={t.mood.title} className="mt-3 grid grid-cols-7 gap-1.5">
        {MOODS.map((m) => {
          const Icon = MOOD_ICONS[m];
          const active = mood === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(m)}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] transition active:scale-95", active ? "bg-cherry text-on-cherry" : "bg-paper text-muted hover:text-ink")}
            >
              <Icon className="h-[18px] w-[18px]" />
              {t.mood.labels[m]}
            </button>
          );
        })}
      </div>
      <p role="alert" className="mt-2 min-h-4 text-xs text-cherry">{error}</p>
    </section>
  );
}
