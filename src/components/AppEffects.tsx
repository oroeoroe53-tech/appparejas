"use client";

import { useEffect } from "react";
import { resyncPush } from "@/lib/push-client";
import type { ThemePreference } from "@/lib/types";

/** Applies the account theme and quietly refreshes this device's push subscription once per session. */
export function AppEffects({ theme, pushWanted }: { theme: ThemePreference; pushWanted: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
    try {
      localStorage.setItem("us-theme", theme);
    } catch {
      // Storage unavailable (private mode): the account setting still applies on each load.
    }
  }, [theme]);

  useEffect(() => {
    if (!pushWanted) return;
    try {
      if (sessionStorage.getItem("us-push-synced")) return;
      sessionStorage.setItem("us-push-synced", "1");
    } catch {
      // Without sessionStorage we simply resync on each mount.
    }
    resyncPush().catch(() => undefined);
  }, [pushWanted]);
  return null;
}
