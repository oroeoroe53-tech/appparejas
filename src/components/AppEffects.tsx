"use client";

import { useEffect } from "react";
import { setTimezoneAction } from "@/app/actions/gestures";
import { resyncPush } from "@/lib/push-client";
import type { ThemePreference } from "@/lib/types";

/** Applies the account theme and quietly refreshes this device's push subscription once per session. */
export function AppEffects({ theme, pushWanted, unread, timezone }: { theme: ThemePreference; pushWanted: boolean; unread: number; timezone: string | null }) {
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

  // Share this device's time zone so your person can see what time it is for you.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!tz || tz === timezone) return;
      // Ask at most once per browser session, even if the server declines the name.
      if (sessionStorage.getItem("us-tz-sent") === tz) return;
      sessionStorage.setItem("us-tz-sent", tz);
      void setTimezoneAction(tz);
    } catch {
      // Time zone unavailable: nothing to share.
    }
  }, [timezone]);

  // Keep the number on the app icon in step with what is really unread (works in installed apps that support badges).
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (unread > 0) nav.setAppBadge?.(unread).catch(() => undefined);
    else nav.clearAppBadge?.().catch(() => undefined);
  }, [unread]);

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
