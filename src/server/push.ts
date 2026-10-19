import "server-only";
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pushServerConfig } from "@/lib/env";
import type { PushPayload } from "@/lib/notifications";

export type PushOutcome =
  | { status: "unconfigured" }
  | { status: "no_subscriptions" }
  | { status: "sent" | "failed"; attempted: number; accepted: number };

const MAX_FAILURES = 5;
let configured = false;

function configure(): boolean {
  const cfg = pushServerConfig();
  if (!cfg) return false;
  if (!configured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    configured = true;
  }
  return true;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
}

/**
 * Sends a Web Push notification to every device of a user.
 * "accepted" means the push service took it, not that the device displayed it.
 * Expired/revoked subscriptions (404/410) are removed; repeated failures are pruned.
 * Never logs the payload.
 */
export async function sendPushToUser(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<PushOutcome> {
  if (!configure()) return { status: "unconfigured" };

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, failure_count")
    .eq("user_id", userId);
  if (error) return { status: "failed", attempted: 0, accepted: 0 };
  const subs = (data ?? []) as SubscriptionRow[];
  if (subs.length === 0) return { status: "no_subscriptions" };

  const body = JSON.stringify(payload);
  const results = await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, {
          TTL: 60 * 60 * 24,
          urgency: "normal",
          timeout: 8000,
        });
        await admin
          .from("push_subscriptions")
          .update({ last_success_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", sub.id);
        return true;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410 || sub.failure_count + 1 >= MAX_FAILURES) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          await admin.from("push_subscriptions").update({ failure_count: sub.failure_count + 1 }).eq("id", sub.id);
        }
        return false;
      }
    }),
  );

  const accepted = results.filter(Boolean).length;
  return { status: accepted > 0 ? "sent" : "failed", attempted: subs.length, accepted };
}
