import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

// Any authenticated Google account counts as a customer — no allow-list,
// unlike assertAdmin(). Server Functions are reachable via direct POST
// even without the UI, so every customer Server Action must re-verify the
// session itself — proxy.ts gates page navigation, not actions.
export async function assertCustomer(): Promise<string> {
  const authClient = await getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    throw new Error("Unauthorized");
  }

  return user.email;
}

// Non-throwing variant for pages that render differently for logged-in
// vs. guest visitors (header nav, checkout's saved-address selector)
// instead of gating the whole page.
export async function getCustomerEmail(): Promise<string | null> {
  const authClient = await getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  return user?.email ?? null;
}
