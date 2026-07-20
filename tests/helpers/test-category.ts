import { getSupabaseServerClient } from "@/lib/supabase/server";

// Shared scratch category ("Test") reused across test files' scratch
// products — get-or-create so repeated runs don't collide on the unique
// name constraint. Never deleted: a permanent fixture, same role the
// literal "Test" string played before categories became a real table.
export async function getOrCreateTestCategoryId(): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data: existing, error: fetchErr } = await supabase
    .from("categories")
    .select("id")
    .eq("name", "Test")
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (existing) return existing.id;

  const { data: created, error: insertErr } = await supabase
    .from("categories")
    .insert({ name: "Test" })
    .select("id")
    .single();

  if (insertErr) throw insertErr;
  return created.id;
}
