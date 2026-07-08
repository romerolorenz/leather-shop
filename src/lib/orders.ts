import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/products";

export type OrderItem = {
  slug: string;
  name: string;
  variantLabel: string;
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
    public variantLabel: string
  ) {
    super(`${productName} (${variantLabel}) no longer has enough stock.`);
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
      variant_label: item.variantLabel,
      quantity: item.quantity,
      unit_price_centavos: item.priceCentavos,
    }))
  );

  if (itemsErr) {
    await supabase.from("orders").delete().eq("id", orderRow.id);
    throw itemsErr;
  }

  const decremented: { productId: string; quantity: number }[] = [];
  for (const item of input.items) {
    const { error } = await supabase.rpc("decrement_product_stock", {
      p_product_id: item.productId,
      p_quantity: item.quantity,
    });

    if (error) {
      for (const done of decremented) {
        await supabase.rpc("restore_product_stock", {
          p_product_id: done.productId,
          p_quantity: done.quantity,
        });
      }
      await supabase.from("orders").delete().eq("id", orderRow.id);
      throw new InsufficientStockError(item.name, item.variantLabel);
    }

    decremented.push({ productId: item.productId, quantity: item.quantity });
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

  // Guarded status update happens FIRST — only restore stock if this order
  // was actually still pending_payment. Restoring unconditionally would add
  // stock back for an order that's already paid/shipped/cancelled.
  const { data: updated, error: statusErr } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "pending_payment")
    .select("id");

  if (statusErr) throw statusErr;
  if ((updated?.length ?? 0) === 0) {
    return false;
  }

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (itemsErr) throw itemsErr;

  for (const item of items) {
    const { error } = await supabase.rpc("restore_product_stock", {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    });
    if (error) throw error;
  }

  return true;
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

type OrderRow = {
  id: string;
  created_at: string;
  status: OrderStatus;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_street: string;
  shipping_city: string;
  subtotal_centavos: number;
  shipping_centavos: number;
  total_centavos: number;
  order_items: {
    quantity: number;
    unit_price_centavos: number;
    variant_label: string;
    products: { slug: string; name: string } | null;
  }[];
};

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    shippingAddress: {
      street: row.shipping_street,
      city: row.shipping_city,
    },
    items: row.order_items.map((item) => ({
      slug: item.products?.slug ?? "",
      name: item.products?.name ?? "(deleted product)",
      variantLabel: item.variant_label,
      quantity: item.quantity,
      priceCentavos: item.unit_price_centavos,
    })),
    subtotalCentavos: row.subtotal_centavos,
    shippingCentavos: row.shipping_centavos,
    totalCentavos: row.total_centavos,
  };
}

const ORDER_SELECT =
  "id, created_at, status, customer_name, customer_email, customer_phone, shipping_street, shipping_city, subtotal_centavos, shipping_centavos, total_centavos, order_items(quantity, unit_price_centavos, variant_label, products(slug, name))";

export async function listOrdersForAdmin(): Promise<Order[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as OrderRow[]).map(mapOrderRow);
}

// Order history (Phase 8, US-17) — scoped to the logged-in customer's own
// orders by matching their verified Google account email against
// orders.customer_email (the email typed at checkout, guest or not).
export async function listOrdersForCustomer(email: string): Promise<Order[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("customer_email", email)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as unknown as OrderRow[]).map(mapOrderRow);
}

// Each item's product photo, keyed by slug — used by the order
// confirmation email and the customer order-history page. Dedupes slugs
// across all passed-in orders so a customer's order history only fetches
// each product once, not once per order.
export async function getOrderItemPhotos(
  orders: Order[]
): Promise<Record<string, string | null>> {
  const uniqueSlugs = [
    ...new Set(orders.flatMap((order) => order.items.map((item) => item.slug))),
  ];
  const entries = await Promise.all(
    uniqueSlugs.map(async (slug) => {
      const product = await getProductBySlug(slug);
      return [slug, product?.photos[0] ?? null] as const;
    })
  );
  return Object.fromEntries(entries);
}

export async function markOrderPaid(orderId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  if (error) throw error;
}

export async function markOrderShipped(orderId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("orders")
    .update({ status: "shipped" })
    .eq("id", orderId)
    .eq("status", "paid");

  if (error) throw error;
}

export async function getSalesSummary(): Promise<{
  pendingCount: number;
  paidCount: number;
  shippedCount: number;
  revenueCentavos: number;
}> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select("status, total_centavos");

  if (error) throw error;

  const paidAndShipped = data.filter(
    (row) => row.status === "paid" || row.status === "shipped"
  );

  return {
    pendingCount: data.filter((row) => row.status === "pending_payment")
      .length,
    paidCount: data.filter((row) => row.status === "paid").length,
    shippedCount: data.filter((row) => row.status === "shipped").length,
    revenueCentavos: paidAndShipped.reduce(
      (sum, row) => sum + row.total_centavos,
      0
    ),
  };
}
