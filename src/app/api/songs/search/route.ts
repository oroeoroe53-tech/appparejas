import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { searchSongs, storeCountry } from "@/server/songs";

/** Song search for the composer. Signed-in users only, rate limited in the database. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2 || q.length > 80) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supabase = await createClient();
  const user = await currentUser(supabase);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error: limitError } = await supabase.rpc("consume_song_search_limit");
  if (limitError) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const results = await searchSongs(q, storeCountry(request.headers.get("accept-language")));
  if (results === null) return NextResponse.json({ error: "upstream" }, { status: 502 });
  return NextResponse.json({ results });
}
