import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // proxy.ts already gates this route to any logged-in Google account —
  // this just reads the session to display who's signed in.
  const supabase = await getSupabaseAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-black/[.08] bg-white text-sm dark:border-white/[.145] dark:bg-[#121110]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 sm:px-10">
          <span className="text-zinc-500 dark:text-zinc-400">Signed in as {user?.email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
