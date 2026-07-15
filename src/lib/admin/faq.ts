import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setPositions } from "@/lib/admin/reorder";

export type AdminFaqItem = {
  id: string;
  question: string;
  answer: string;
  position: number;
};

export async function listFaqItemsForAdmin(): Promise<AdminFaqItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("faq_items")
    .select("id, question, answer, position")
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}

export async function createFaqItem(
  question: string,
  answer: string
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("faq_items")
    .select("position")
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase
    .from("faq_items")
    .insert({ question, answer, position: nextPosition });

  if (error) throw error;
}

export async function updateFaqItem(
  id: string,
  question: string,
  answer: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("faq_items")
    .update({ question, answer })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteFaqItem(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("faq_items").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderFaqItems(orderedIds: string[]): Promise<void> {
  const supabase = getSupabaseServerClient();
  await setPositions(supabase, "faq_items", {}, "id", "position", orderedIds);
}
