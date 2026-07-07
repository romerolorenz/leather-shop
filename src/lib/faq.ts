import { getSupabaseServerClient } from "@/lib/supabase/server";

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export async function getFaqItems(): Promise<FaqItem[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("faq_items")
    .select("id, question, answer")
    .order("position", { ascending: true });

  if (error) throw error;
  return data;
}
