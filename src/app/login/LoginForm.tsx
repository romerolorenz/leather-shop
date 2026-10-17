"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { BTN, BTN_DEFAULT, BTN_PRIMARY } from "@/components/button-styles";

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: "That Google account isn't authorized for admin access.",
  auth_failed: "Something went wrong signing in. Please try again.",
};

export default function LoginForm({
  error,
  next,
}: {
  error?: string;
  next?: string;
}) {
  const isAdmin = next?.startsWith("/admin") ?? false;

  async function handleSignIn() {
    const supabase = getSupabaseBrowserClient();
    const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
    if (next) callbackUrl.searchParams.set("next", next);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: { prompt: "select_account" },
      },
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        {isAdmin ? "Admin Login" : "Log In"}
      </h1>
      {error && ERROR_MESSAGES[error] && (
        <p className="text-sm text-red-600">{ERROR_MESSAGES[error]}</p>
      )}
      <button
        type="button"
        onClick={handleSignIn}
        className={`${BTN} ${BTN_DEFAULT} ${BTN_PRIMARY}`}
      >
        Sign in with Google
      </button>
    </main>
  );
}
