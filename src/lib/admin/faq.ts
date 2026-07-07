import { getSupabaseServerClient } from "@/lib/supabase/server";

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

export async function moveFaqItem(
  id: string,
  direction: "up" | "down"
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: items, error } = await supabase
    .from("faq_items")
    .select("id, position")
    .order("position", { ascending: true });

  if (error) throw error;

  const index = items.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= items.length) return;

  const current = items[index];
  const swap = items[swapIndex];

  const { error: currentErr } = await supabase
    .from("faq_items")
    .update({ position: swap.position })
    .eq("id", current.id);
  if (currentErr) throw currentErr;

  const { error: swapErr } = await supabase
    .from("faq_items")
    .update({ position: current.position })
    .eq("id", swap.id);
  if (swapErr) throw swapErr;
}
