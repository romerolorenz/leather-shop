import { createBrowserClient } from "@supabase/ssr";

// Browser-side client for the Google login flow (Phase 4). Distinct from
// server.ts's service-role client — this one uses the public anon key and
// runs client-side, so it must never be used for privileged data access.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
