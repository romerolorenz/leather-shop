import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OrderItem = {
  slug: string;
  name: string;
  variant: string;
  quantity: number;
  priceCentavos: number;
};

export type NewOrderItem = OrderItem & {
  productId: string;
  variantId: string;
};

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "cancelled";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    street: string;
    city: string;
  };
  items: OrderItem[];
  subtotalCentavos: number;
  shippingCentavos: number;
  totalCentavos: number;
};

export type NewOrder = {
  customer: Order["customer"];
  shippingAddress: Order["shippingAddress"];
  items: NewOrderItem[];
  subtotalCentavos: number;
  shippingCentavos: number;
  totalCentavos: number;
};

export class InsufficientStockError extends Error {
  constructor(
    public productName: string,
    public variant: string
  ) {
    super(`${productName} (${variant}) no longer has enough stock.`);
    this.name = "InsufficientStockError";
  }
}

// Creates the order + order_items, then decrements stock for each item via
// an atomic Postgres function (see supabase/migrations/0002_stock_functions.sql)
// — stock is decremented at order placement, not at payment confirmation,
// to prevent overselling the last unit during the manual-payment window
// (PRD §5). If any item's stock decrement fails (lost a race, or the item
// went unavailable between validation and this call), previously-decremented
// items in this same order are restored and the order row is deleted, so a
// failed order never leaves partial state behind.
export async function createOrder(input: NewOrder): Promise<Order> {
  const supabase = getSupabaseServerClient();

  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert({
      customer_name: input.customer.name,
      customer_email: input.customer.email,
      customer_phone: input.customer.phone,
      shipping_street: input.shippingAddress.street,
      shipping_city: input.shippingAddress.city,
      subtotal_centavos: input.subtotalCentavos,
      shipping_centavos: input.shippingCentavos,
      total_centavos: input.totalCentavos,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  const { error: itemsErr } = await supabase.from("order_items").insert(
    input.items.map((item) => ({
      order_id: orderRow.id,
      product_id: item.productId,
      variant_id: item.variantId,
      quantity: item.quantity,
      unit_price_centavos: item.priceCentavos,
    }))
  );

  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", orderRow.id);
    throw itemsErr;
  }

  const decremented: { variantId: string; quantity: number }[] = [];
  for (const item of input.items) {
    const { error } = await supabase.rpc("decrement_variant_stock", {
      p_variant_id: item.variantId,
      p_quantity: item.quantity,
    });

    if (error) {
      for (const done of decremented) {
        await supabase.rpc("restore_variant_stock", {
          p_variant_id: done.variantId,
          p_quantity: done.quantity,
        });
      }
      await supabase.from("orders").delete().eq("id", orderRow.id);
      throw new InsufficientStockError(item.name, item.variant);
    }

    decremented.push({ variantId: item.variantId, quantity: item.quantity });
  }

  return {
    id: orderRow.id,
    createdAt: orderRow.created_at,
    status: orderRow.status,
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    items: input.items,
    subtotalCentavos: input.subtotalCentavos,
    shippingCentavos: input.shippingCentavos,
    totalCentavos: input.totalCentavos,
  };
}

// Manual cancel (admin, before the hold expires) and automatic expiry
// (scheduled job) both funnel through this. Returns false if the order
// wasn't in pending_payment (already paid/shipped/cancelled) — guards
// against double-restoring stock.
export async function cancelOrderAndRestoreStock(
  orderId: string
): Promise<boolean> {
  const supabase = getSupabaseServerClient();

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("variant_id, quantity")
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;

  for (const item of items) {
    const { error } = await supabase.rpc("restore_variant_stock", {
      p_variant_id: item.variant_id,
      p_quantity: item.quantity,
    });
    if (error) throw error;
  }

  const { data: updated, error: statusErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id");

  if (statusErr) throw statusErr;
  return (updated?.length ?? 0) > 0;
}

// Used by the order-expiry scheduled job (POST /api/orders/expire).
export async function getExpiredPendingOrderIds(
  holdHours: number
): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const cutoff = new Date(Date.now() - holdHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "pending_payment")
    .lt("created_at", cutoff);

  if (error) throw error;
  return data.map((row) => row.id);
}
