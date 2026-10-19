"use client";

import { publicEnv } from "./env";

export type PushAvailability = "unsupported" | "needs-install" | "unconfigured" | "ready";

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function pushAvailability(): PushAvailability {
  if (isIos() && !isStandalone()) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (!publicEnv.vapidPublicKey) return "unconfigured";
  return "ready";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  try {
    return await (await registration()).pushManager.getSubscription();
  } catch {
    return null;
  }
}

async function sendToServer(subscription: PushSubscription): Promise<boolean> {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(subscription.toJSON()),
  });
  return res.ok;
}

export type EnableResult = "enabled" | "denied" | "error";

/** Must be called from a user gesture (a click). Asks for permission only here, never on load. */
export async function enablePush(): Promise<EnableResult> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return permission === "denied" ? "denied" : "error";
    const reg = await registration();
    const existing = await reg.pushManager.getSubscription();
    const subscription =
      existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) }));
    if (!(await sendToServer(subscription))) {
      if (!existing) await subscription.unsubscribe();
      return "error";
    }
    return "enabled";
  } catch {
    return "error";
  }
}

export async function disablePush(): Promise<boolean> {
  try {
    const subscription = await currentSubscription();
    if (subscription) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/** Keeps the server's copy of this device's subscription fresh (renewals, user switches on a shared device). */
export async function resyncPush(): Promise<void> {
  if (pushAvailability() !== "ready" || Notification.permission !== "granted") return;
  const reg = await registration();
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicEnv.vapidPublicKey) }));
  await sendToServer(subscription);
}
