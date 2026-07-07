import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cookie-aware Supabase client for reading the logged-in user's session in
// Server Components, Route Handlers, and Server Functions. Uses the anon
// key (respects RLS) — not to be confused with server.ts's service-role
// client, which is for data access, not session/auth state.
//
// Server Components can't set cookies (see Next.js cookies() docs), so
// setAll is wrapped in try/catch there; middleware.ts is what actually
// handles session refresh — this helper's setAll only matters when called
// from a Route Handler (auth callback, sign-out).
export async function getSupabaseAuthServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — no-op, middleware refreshes
            // the session instead.
          }
        },
      },
    }
  );
}
