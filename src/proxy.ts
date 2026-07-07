import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Gates /admin/* (PRD §6: allow-list only) and /account/* (Phase 8: any
// logged-in Google account, no allow-list). Both require a session;
// /admin/* additionally requires allow-list membership.
//
// Next.js 16 renamed the "middleware" file convention to "proxy" (the
// exported function is now named `proxy`, not `middleware`) — this file
// used to be src/middleware.ts.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    // admin_users has RLS with no policies (default-deny) — only the
    // service-role key (server-only, never shipped to the browser) can
    // read it. See supabase/migrations/0003_admin_users.sql.
    const supabase = getSupabaseServerClient();
    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("email")
      .eq("email", user.email)
      .maybeSingle();

    if (!adminUser) {
      return NextResponse.redirect(
        new URL("/login?error=unauthorized", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
