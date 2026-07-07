import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Gates /admin/* — see PRD §6 (Admin access: Google login restricted to an
// allow-list). Only scoped to /admin for now since that's the only place
// auth matters until Phase 8 adds customer accounts.
//
// Next.js 16 renamed the "middleware" file convention to "proxy" (the
// exported function is now named `proxy`, not `middleware`) — this file
// used to be src/middleware.ts.
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

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

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
