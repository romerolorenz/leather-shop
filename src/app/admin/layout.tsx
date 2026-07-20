import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // middleware.ts already gates this route to allow-listed emails only —
  // this just reads the session to display who's signed in. ToastProvider
  // is mounted once, site-wide, in the root layout.
  const supabase = await getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar email={user?.email ?? null} />
      {/* Explicit paper token instead of relying on the sitewide
          --background var — that's a pre-Quiet&Confident value
          (#0a0a0a) that doesn't match the sidebar's dark tone
          (#121110/#171513), a visible seam in dark mode otherwise. */}
      <div className="min-w-0 flex-1 bg-white dark:bg-[#121110]">
        {children}
      </div>
    </div>
  );
}
