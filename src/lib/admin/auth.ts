import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Server Functions are reachable via direct POST even without the UI, so
// every admin Server Action must re-verify authorization itself — proxy.ts
// gates page navigation, but that's not a substitute for checking inside
// the action (per Next.js's own data-security guidance).
export async function assertAdmin(): Promise<string> {
  const authClient = await getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user?.email) {
    throw new Error("Unauthorized");
  }

  const supabase = getSupabaseServerClient();
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  if (!adminUser) {
    throw new Error("Unauthorized");
  }

  return user.email;
}
