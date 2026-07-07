import { NextResponse } from "next/server";
import { getSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

export async function POST(request: Request) {
  const supabase = await getSupabaseAuthServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
