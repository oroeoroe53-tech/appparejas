"use client";

import { Bell, BellOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { updatePreferencesAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { t } from "@/content";
import { currentSubscription, disablePush, enablePush, pushAvailability, type PushAvailability } from "@/lib/push-client";
import type { PreviewMode } from "@/lib/types";
import { cn } from "@/lib/utils";

type DeviceState = "checking" | PushAvailability | "denied" | "off" | "on";

export function NotificationSettings({ enabled: initialEnabled, previewMode: initialMode }: { enabled: boolean; previewMode: PreviewMode }) {
  const n = t.settings.notifications;
  const [device, setDevice] = useState<DeviceState>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [mode, setMode] = useState<PreviewMode>(initialMode);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const availability = pushAvailability();
      if (availability !== "ready") return !cancelled && setDevice(availability);
      if (Notification.permission === "denied") return !cancelled && setDevice("denied");
      const sub = Notification.permission === "granted" ? await currentSubscription() : null;
      if (!cancelled) setDevice(sub ? "on" : "off");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(undefined);
    const result = await enablePush();
    setBusy(false);
    if (result === "enabled") {
      setDevice("on");
      if (!enabled) savePref({ notifications_enabled: true });
    } else if (result === "denied") setDevice("denied");
    else setMessage(t.settings.errors.generic);
  }

  async function turnOff() {
    setBusy(true);
    setMessage(undefined);
    const ok = await disablePush();
    setBusy(false);
    if (ok) setDevice("off");
    else setMessage(t.settings.errors.generic);
  }

  async function sendTest() {
    setBusy(true);
    setMessage(undefined);
    try {
      const res = await fetch("/api/push/test", { method: "POST", credentials: "same-origin" });
      const body = (await res.json().catch(() => ({}))) as { status?: string };
      if (res.status === 429) setMessage(n.testLimited);
      else if (body.status === "sent") setMessage(n.testSent);
      else if (body.status === "no_subscriptions") setMessage(n.testNone);
      else if (body.status === "unconfigured") setMessage(n.notConfigured);
      else setMessage(n.testFailed);
    } catch {
      setMessage(n.testFailed);
    }
    setBusy(false);
  }

  function savePref(patch: { notifications_enabled?: boolean; notification_preview_mode?: PreviewMode }) {
    startTransition(async () => {
      const res = await updatePreferencesAction(patch);
      if (!res.ok) {
        setMessage(t.settings.errors.generic);
        if (patch.notifications_enabled !== undefined) setEnabled(!patch.notifications_enabled);
        if (patch.notification_preview_mode) setMode(patch.notification_preview_mode === "full" ? "generic" : "full");
      }
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-[15px] text-muted">{n.intro}</p>

      <div className="rounded-2xl border border-line p-4" aria-live="polite">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium">
          {device === "on" ? <Bell className="h-4 w-4 text-cherry" aria-hidden /> : <BellOff className="h-4 w-4 text-muted" aria-hidden />}
          {n.thisDevice}
        </p>
        {device === "checking" && <p className="text-sm text-muted">{t.common.loading}</p>}
        {device === "unsupported" && <p className="text-sm text-muted">{n.unsupported}</p>}
        {device === "unconfigured" && <p className="text-sm text-muted">{n.notConfigured}</p>}
        {device === "needs-install" && (
          <>
            <p className="text-sm text-muted">{n.needsInstall}</p>
            <Link href="/install" className="mt-3 inline-block text-sm text-cherry underline underline-offset-4">{n.needsInstallCta}</Link>
          </>
        )}
        {device === "denied" && <p className="text-sm text-muted">{n.denied}</p>}
        {device === "off" && (
          <Button onClick={turnOn} disabled={busy} aria-busy={busy} className="w-full">
            {busy ? (<><Spinner /> {n.enabling}</>) : n.enable}
          </Button>
        )}
        {device === "on" && (
          <div className="space-y-3">
            <p className="text-sm">{n.active}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-11 px-4" onClick={sendTest} disabled={busy}>{busy ? n.testing : n.test}</Button>
              <Button variant="ghost" className="min-h-11 px-4" onClick={turnOff} disabled={busy}>{n.disable}</Button>
            </div>
          </div>
        )}
        <p role="status" className="mt-3 min-h-5 text-sm text-muted">{message}</p>
      </div>

      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-[15px] font-medium">{n.accountToggle}</span>
          <span className="block text-[13px] text-muted">{n.accountToggleHint}</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            savePref({ notifications_enabled: e.target.checked });
          }}
          className="mt-1 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-stone/40 transition-colors checked:bg-cherry relative before:absolute before:left-0.5 before:top-0.5 before:h-5 before:w-5 before:rounded-full before:bg-paper before:shadow before:transition-transform checked:before:translate-x-5"
        />
      </label>

      <fieldset>
        <legend className="mb-3 text-[15px] font-medium">{n.previewTitle}</legend>
        <div className="space-y-2" role="radiogroup">
          {([["generic", n.previewGeneric, n.previewGenericHint], ["full", n.previewFull, n.previewFullHint]] as const).map(([value, label, hint]) => (
            <label key={value} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition", mode === value ? "border-cherry bg-rose-soft/50" : "border-line")}>
              <input
                type="radio"
                name="preview"
                value={value}
                checked={mode === value}
                onChange={() => {
                  setMode(value);
                  savePref({ notification_preview_mode: value });
                }}
                className="mt-1 accent-[var(--c-cherry)]"
              />
              <span>
                <span className="block text-[15px] font-medium">{label}</span>
                <span className="block text-[13px] text-muted">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-[13px] text-muted">{n.honesty}</p>
    </div>
  );
}
