import { NextResponse, type NextRequest } from "next/server";
import { buildTestPayload } from "@/lib/notifications";
import { sameOrigin } from "@/lib/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/server/push";

/** Sends a test notification to the signed-in user's own devices. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error: limitError } = await supabase.rpc("consume_test_push_limit");
  if (limitError) return NextResponse.json({ status: "rate_limited" }, { status: 429 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ status: "unconfigured" });
  const outcome = await sendPushToUser(admin, auth.user.id, buildTestPayload());
  return NextResponse.json({ status: outcome.status });
}
