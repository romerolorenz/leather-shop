import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Category = {
  id: string;
  name: string;
};

export async function listCategories(): Promise<Category[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createCategory(name: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("categories").insert({ name });
  if (error) throw error;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

// products.category_id has no ON DELETE behavior configured, so a
// referenced category would fail at the database level anyway — this just
// gives the admin a clearer error than a raw FK-violation message.
export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { count, error: countErr } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Can't delete — ${count} product(s) still use this category.`
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
