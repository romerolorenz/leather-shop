import { getSupabaseServerClient } from "@/lib/supabase/server";

// Cleanup that can't fail silently. Supabase calls return `{ error }`
// instead of throwing, so an unchecked delete that fails leaves test rows
// (or lost stock) on dev with nothing in the test output. Each step's
// failure is recorded and cleanup carries on with the rest, then
// throwIfAny() fails the hook once at the end, listing everything that
// didn't go (same idea as restoreSettings()).

type SupabaseResult = { error: { message: string } | null };

export class CleanupErrors {
  private readonly failures: string[] = [];

  /** Records the call's error, if any. Returns true when it succeeded. */
  check(label: string, result: SupabaseResult): boolean {
    if (!result.error) return true;
    this.failures.push(`${label}: ${result.error.message}`);
    return false;
  }

  /** Runs a step that throws on failure (an app function, restoreSettings). */
  async attempt(label: string, step: () => Promise<unknown>): Promise<boolean> {
    try {
      await step();
      return true;
    } catch (error) {
      // Supabase errors are thrown as plain objects with a message.
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : String(error);
      this.failures.push(`${label}: ${message}`);
      return false;
    }
  }

  throwIfAny(): void {
    if (!this.failures.length) return;
    throw new Error(
      "Cleanup failed, so check dev for leftover test data:\n- " +
        this.failures.join("\n- ")
    );
  }
}

/**
 * Deletes rows by id in one request. A failed delete removes none of them
 * (one statement), and the error is recorded.
 */
export async function deleteRowsById(
  errors: CleanupErrors,
  table: string,
  ids: Iterable<string>
): Promise<void> {
  const idList = [...new Set(ids)];
  if (!idList.length) return;
  errors.check(
    `delete ${idList.length} row(s) from ${table}: ${idList.join(", ")}`,
    await getSupabaseServerClient().from(table).delete().in("id", idList)
  );
}

/**
 * Deletes the orders, then puts back the stock they took. An order that's
 * already cancelled has had its stock restored (by
 * cancelOrderAndRestoreStock or the expiry sweep), so it's only deleted.
 *
 * Batched (a handful of requests however many orders), with the same
 * safety rules as one at a time:
 * - The orders' items are read first, since they're the only record of
 *   how much stock was taken. If they can't be read, nothing is deleted.
 * - Orders that aren't cancelled are deleted with a status condition, and
 *   stock is restored only for the ones that delete actually removed. So
 *   an order cancelled between the read and the delete (its stock already
 *   back) isn't restored twice; it's removed by the cancelled-orders
 *   delete instead.
 * - A failed delete removes none of its orders (one statement), so
 *   nothing is restored for them.
 * - A restore that fails after the delete names the product and quantity
 *   to put back by hand.
 *
 * Any promo_code_redemptions pointing at an order must be deleted first
 * (that FK has no ON DELETE).
 */
export async function deleteOrdersRestoringStock(
  errors: CleanupErrors,
  orderIds: Iterable<string>
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const idList = [...new Set(orderIds)];
  if (!idList.length) return;
  const label = `orders ${idList.join(", ")}`;

  const items = await supabase
    .from("order_items")
    .select("order_id, product_id, quantity")
    .in("order_id", idList);
  if (!errors.check(`read items of ${label} (kept)`, items)) return;

  const removed = await supabase
    .from("orders")
    .delete()
    .in("id", idList)
    .neq("status", "cancelled")
    .select("id");
  if (!errors.check(`delete ${label} (kept, stock not restored)`, removed)) return;

  // Already cancelled (stock already back), including any cancelled since
  // the read above: delete only.
  errors.check(
    `delete cancelled ${label}`,
    await supabase.from("orders").delete().in("id", idList).eq("status", "cancelled")
  );

  const removedIds = new Set((removed.data ?? []).map((o) => o.id));
  const byProduct = new Map<string, number>();
  for (const item of items.data ?? []) {
    if (!removedIds.has(item.order_id)) continue;
    byProduct.set(item.product_id, (byProduct.get(item.product_id) ?? 0) + item.quantity);
  }
  for (const [productId, quantity] of byProduct) {
    errors.check(
      `restore stock after deleting orders: add ${quantity} back to product ` +
        `${productId} by hand`,
      await supabase.rpc("restore_product_stock", {
        p_product_id: productId,
        p_quantity: quantity,
      })
    );
  }
}
