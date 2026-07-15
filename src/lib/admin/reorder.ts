import type { SupabaseClient } from "@supabase/supabase-js";

// Shared swap-adjacent-position reorder, used by moveFaqItem
// (src/lib/admin/faq.ts), moveProductOption, and moveFeaturedProduct
// (both src/lib/admin/catalog.ts) — all three fetch sibling rows ordered
// by position, find index/swapIndex, no-op at a boundary, then swap the
// two positions with two sequential updates. Extracted here for
// moveFeaturedProduct since a third copy-paste of this logic was no
// longer justifiable.
export async function swapPositions(
  supabase: SupabaseClient,
  table: string,
  filter: Record<string, string | boolean>,
  idColumn: string,
  positionColumn: string,
  id: string,
  direction: "up" | "down"
): Promise<void> {
  let query = supabase.from(table).select(`${idColumn}, ${positionColumn}`);
  for (const [column, value] of Object.entries(filter)) {
    query = query.eq(column, value);
  }
  const { data: rows, error } = await query.order(positionColumn, {
    ascending: true,
  });
  if (error) throw error;

  const typedRows = rows as unknown as Record<string, string | number>[];
  const index = typedRows.findIndex((row) => row[idColumn] === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= typedRows.length) return;

  const current = typedRows[index];
  const swap = typedRows[swapIndex];

  const { error: currentErr } = await supabase
    .from(table)
    .update({ [positionColumn]: swap[positionColumn] })
    .eq(idColumn, current[idColumn]);
  if (currentErr) throw currentErr;

  const { error: swapErr } = await supabase
    .from(table)
    .update({ [positionColumn]: current[positionColumn] })
    .eq(idColumn, swap[idColumn]);
  if (swapErr) throw swapErr;
}

// Drag-and-drop reorder: the client already knows the full new order (a
// drop can move an item several positions in one go, not just swap with a
// neighbor), so this just writes each id's new dense index directly rather
// than repeated single-step swaps. Shared by reorderFaqItems
// (src/lib/admin/faq.ts), reorderProductOptions and
// reorderFeaturedProducts (both src/lib/admin/catalog.ts).
export async function setPositions(
  supabase: SupabaseClient,
  table: string,
  filter: Record<string, string | boolean>,
  idColumn: string,
  positionColumn: string,
  orderedIds: string[]
): Promise<void> {
  for (const [index, id] of orderedIds.entries()) {
    let query = supabase
      .from(table)
      .update({ [positionColumn]: index })
      .eq(idColumn, id);
    for (const [column, value] of Object.entries(filter)) {
      query = query.eq(column, value);
    }
    const { error } = await query;
    if (error) throw error;
  }
}
