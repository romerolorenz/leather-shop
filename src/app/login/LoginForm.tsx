"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "That Google account isn't authorized for admin access.",
  auth_failed: "Something went wrong signing in. Please try again.",
};

export default function LoginForm({ error }: { error?: string }) {
  async function handleSignIn() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Login</h1>
      {error && ERROR_MESSAGES[error] && (
        <p className="text-sm text-red-600">{ERROR_MESSAGES[error]}</p>
      )}
      <button
        onClick={handleSignIn}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Sign in with Google
      </button>
    </main>
  );
}
