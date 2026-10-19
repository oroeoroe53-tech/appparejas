import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { currentUser } from "@/lib/supabase/auth";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PREFIXES = ["/welcome", "/login", "/register", "/forgot-password", "/auth", "/offline", "/setup", "/join", "/dev"];

function isPublic(pathname: string) {
  return pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Scheduled jobs authenticate with their own secret (checked in the route), not with a user session.
  if (pathname.startsWith("/api/cron/")) return NextResponse.next();

  if (!isSupabaseConfigured()) {
    if (pathname === "/setup" || pathname === "/offline" || pathname.startsWith("/dev") || pathname === "/welcome") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/setup", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // The token signature is verified locally (no network round trip); the cookie alone is never trusted.
  const user = await currentUser(supabase);

  if (!user && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/home", request.url));
  }
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, the service worker, manifest and icons.
    "/((?!_next/static|_next/image|sw.js|manifest.webmanifest|icons/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
