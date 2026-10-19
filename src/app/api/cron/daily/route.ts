import { NextResponse, type NextRequest } from "next/server";
import { t } from "@/content";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { todayIso, upcoming, type EventRow } from "@/lib/dates";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Message } from "@/lib/types";
import { notifyRecipient } from "@/server/deliver";
import { pushDirect } from "@/server/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs once a day (see vercel.json):
 *  1. time-capsule messages that have just opened get their notification;
 *  2. today's and tomorrow's plans, anniversaries and milestones are announced to both people.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const summary = { capsules: 0, reminders: 0 };

  // 1) Capsules. Claim each row first so an overlapping run can never notify twice.
  const { data: due } = await admin
    .from("messages")
    .select("*")
    .not("deliver_at", "is", null)
    .lte("deliver_at", new Date().toISOString())
    .eq("push_status", "pending")
    .limit(200);
  for (const message of (due ?? []) as Message[]) {
    const { data: claimed } = await admin.from("messages").update({ push_status: "skipped" }).eq("id", message.id).eq("push_status", "pending").select("id");
    if (!claimed || claimed.length === 0) continue;
    await notifyRecipient(message);
    summary.capsules += 1;
  }

  // 2) Reminders for active couples.
  const today = todayIso(new Date());
  const { data: spaces } = await admin.from("couple_spaces").select("id, together_since").eq("status", "active").limit(1000);
  const ids = ((spaces ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (ids.length > 0) {
    const [{ data: events }, { data: members }] = await Promise.all([
      admin.from("couple_events").select("id, couple_space_id, title, note, event_date, repeat_yearly, kind").in("couple_space_id", ids).limit(10000),
      admin.from("couple_members").select("couple_space_id, user_id").in("couple_space_id", ids).limit(2000),
    ]);
    for (const space of (spaces ?? []) as Array<{ id: string; together_since: string | null }>) {
      const people = ((members ?? []) as Array<{ couple_space_id: string; user_id: string }>).filter((m) => m.couple_space_id === space.id).map((m) => m.user_id);
      const rows = ((events ?? []) as Array<EventRow & { couple_space_id: string }>).filter((e) => e.couple_space_id === space.id);
      const items = upcoming({ events: rows, togetherSince: space.together_since, today, horizon: 1 });
      for (const item of items) {
        const label = item.source === "event" ? item.title : item.source === "milestone" ? t.plans.milestoneDay(item.count ?? 0) : t.plans.anniversaryYear(item.count ?? 0);
        for (const userId of people) {
          await pushDirect({
            toUserId: userId,
            tag: `reminder-${item.key}-${item.date}`,
            url: "/us/plans",
            fullBody: item.daysAway === 0 ? t.reminders.today(label) : t.reminders.tomorrow(label),
            genericBody: t.reminders.generic,
          });
          summary.reminders += 1;
        }
      }
    }
  }
  return NextResponse.json({ ok: true, ...summary });
}
