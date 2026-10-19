"use client";

import { useSyncExternalStore } from "react";
import { t } from "@/content";

function subscribe(callback: () => void) {
  const id = window.setInterval(callback, 20_000);
  return () => window.clearInterval(id);
}

/** Shows what time it is for your person, right now. Renders nothing until the browser can say. */
export function LocalClock({ timezone, name, className }: { timezone: string; name: string; className?: string }) {
  const time = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timezone }).format(new Date());
      } catch {
        return "";
      }
    },
    () => "",
  );
  if (!time) return null;
  return <p className={className}>{t.portrait.localTime(time, name)}</p>;
}
