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

/** Deletes rows by id, one request each, recording any failure. */
export async function deleteRowsById(
  errors: CleanupErrors,
  table: string,
  ids: Iterable<string>
): Promise<void> {
  const supabase = getSupabaseServerClient();
  for (const id of ids) {
    errors.check(
      `delete ${table} ${id}`,
      await supabase.from(table).delete().eq("id", id)
    );
  }
}

/**
 * Deletes each order, then puts back the stock it took. An order that's
 * already cancelled has had its stock restored (by
 * cancelOrderAndRestoreStock or the expiry sweep), so it's only deleted.
 *
 * Order of operations: read the items, delete the order, then restore
 * stock from the in-memory item list. So an order that can't be deleted
 * still holds its stock (nothing to double-restore later), and an order
 * whose status or items can't be read is kept, since its items are the
 * only record of how much stock it took. A restore that fails after the
 * delete names the product and quantity to put back by hand.
 *
 * Any promo_code_redemptions pointing at an order must be deleted first
 * (that FK has no ON DELETE).
 */
export async function deleteOrdersRestoringStock(
  errors: CleanupErrors,
  orderIds: Iterable<string>
): Promise<void> {
  const supabase = getSupabaseServerClient();
  for (const orderId of orderIds) {
    const order = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();
    if (!errors.check(`look up order ${orderId} (kept)`, order)) continue;
    if (!order.data) continue; // already gone

    let toRestore: { product_id: string; quantity: number }[] = [];
    if (order.data.status !== "cancelled") {
      const items = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);
      if (!errors.check(`read items of order ${orderId} (kept)`, items)) continue;
      toRestore = items.data ?? [];
    }

    const deleted = errors.check(
      `delete order ${orderId} (kept, stock not restored)`,
      await supabase.from("orders").delete().eq("id", orderId)
    );
    if (!deleted) continue;

    for (const item of toRestore) {
      errors.check(
        `restore stock after deleting order ${orderId}: add ${item.quantity} ` +
          `back to product ${item.product_id} by hand`,
        await supabase.rpc("restore_product_stock", {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        })
      );
    }
  }
}
