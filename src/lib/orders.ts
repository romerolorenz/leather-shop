import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProductBySlug } from "@/lib/products";
import { redeemPromoCode } from "@/lib/promo-codes";

export type OrderItemOption = {
  optionTypeName: string;
  optionValue: string;
};

export type OrderItem = {
  slug: string;
  name: string;
  options: OrderItemOption[];
  quantity: number;
  priceCentavos: number;
};

export type NewOrderItem = OrderItem & {
  productId: string;
};

// "Color: Black, Size: Large" — for order display in emails/admin/account.
// Empty for a product with no option types.
export function formatItemOptions(options: OrderItemOption[]): string {
  return options
    .map((o) => `${o.optionTypeName}: ${o.optionValue}`)
    .join(", ");
}

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
    address2: string;
    barangay: string;
    city: string;
    postalCode: string;
  };
  items: OrderItem[];
  subtotalCentavos: number;
  shippingCentavos: number;
  // Snapshotted at order time, same reasoning as unit_price_centavos — a
  // later edit/deactivation of the promo code shouldn't rewrite what a
  // past order actually charged.
  promoCode: string | null;
  discountCentavos: number;
  totalCentavos: number;
};

export type NewOrder = {
  customer: Order["customer"];
  shippingAddress: Order["shippingAddress"];
  items: NewOrderItem[];
  subtotalCentavos: number;
  shippingCentavos: number;
  promoCodeId: string | null;
  promoCode: string | null;
  discountCentavos: number;
  totalCentavos: number;
};

export class InsufficientStockError extends Error {
  constructor(public productName: string) {
    super(`${productName} no longer has enough stock.`);
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
      shipping_address2: input.shippingAddress.address2 || null,
      shipping_barangay: input.shippingAddress.barangay,
      shipping_city: input.shippingAddress.city,
      shipping_postal_code: input.shippingAddress.postalCode,
      subtotal_centavos: input.subtotalCentavos,
      shipping_centavos: input.shippingCentavos,
      promo_code_id: input.promoCodeId,
      discount_centavos: input.discountCentavos,
      total_centavos: input.totalCentavos,
    })
    .select()
    .single();

  if (orderErr) throw orderErr;

  // Inserted one at a time (not a single bulk insert) so each row's id is
  // deterministically tied to its source item — needed to attach the right
  // order_item_options rows to the right order_item afterward.
  const insertedItems: { id: string; item: NewOrderItem }[] = [];
  for (const item of input.items) {
    const { data: itemRow, error: itemErr } = await supabase
      .from("order_items")
      .insert({
        order_id: orderRow.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price_centavos: item.priceCentavos,
      })
      .select("id")
      .single();

    if (itemErr) {
      await supabase.from("orders").delete().eq("id", orderRow.id);
      throw itemErr;
    }

    insertedItems.push({ id: itemRow.id, item });
  }

  const optionRows = insertedItems.flatMap(({ id, item }) =>
    item.options.map((option, index) => ({
      order_item_id: id,
      option_type_name: option.optionTypeName,
      option_value: option.optionValue,
      position: index,
    }))
  );

  if (optionRows.length > 0) {
    const { error: optionsErr } = await supabase
      .from("order_item_options")
      .insert(optionRows);

    if (optionsErr) {
      await supabase.from("orders").delete().eq("id", orderRow.id);
      throw optionsErr;
    }
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
      throw new InsufficientStockError(item.name);
    }

    decremented.push({ productId: item.productId, quantity: item.quantity });
  }

  // Redemption is the last thing that can fail — if it does (lost the race
  // on the total usage cap, or a double-submit redeemed the same code
  // twice for this customer), unwind everything already done above so a
  // failed order never leaves partial state (same compensating-rollback
  // shape as the stock decrement loop just above).
  if (input.promoCodeId) {
    try {
      await redeemPromoCode(input.promoCodeId, input.customer.email, orderRow.id);
    } catch (err) {
      for (const done of decremented) {
        await supabase.rpc("restore_product_stock", {
          p_product_id: done.productId,
          p_quantity: done.quantity,
        });
      }
      await supabase.from("orders").delete().eq("id", orderRow.id);
      throw err;
    }
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
    promoCode: input.promoCode,
    discountCentavos: input.discountCentavos,
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
  shipping_address2: string | null;
  shipping_barangay: string | null;
  shipping_city: string;
  shipping_postal_code: string | null;
  subtotal_centavos: number;
  shipping_centavos: number;
  discount_centavos: number;
  promo_codes: { code: string } | null;
  total_centavos: number;
  order_items: {
    quantity: number;
    unit_price_centavos: number;
    order_item_options: {
      option_type_name: string;
      option_value: string;
      position: number;
    }[];
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
      address2: row.shipping_address2 ?? "",
      barangay: row.shipping_barangay ?? "",
      city: row.shipping_city,
      postalCode: row.shipping_postal_code ?? "",
    },
    items: row.order_items.map((item) => ({
      slug: item.products?.slug ?? "",
      name: item.products?.name ?? "(deleted product)",
      options: [...item.order_item_options]
        .sort((a, b) => a.position - b.position)
        .map((o) => ({
          optionTypeName: o.option_type_name,
          optionValue: o.option_value,
        })),
      quantity: item.quantity,
      priceCentavos: item.unit_price_centavos,
    })),
    subtotalCentavos: row.subtotal_centavos,
    shippingCentavos: row.shipping_centavos,
    promoCode: row.promo_codes?.code ?? null,
    discountCentavos: row.discount_centavos,
    totalCentavos: row.total_centavos,
  };
}

const ORDER_SELECT =
  "id, created_at, status, customer_name, customer_email, customer_phone, shipping_street, shipping_address2, shipping_barangay, shipping_city, shipping_postal_code, subtotal_centavos, shipping_centavos, discount_centavos, promo_codes(code), total_centavos, order_items(quantity, unit_price_centavos, order_item_options(option_type_name, option_value, position), products(slug, name))";

// Single-order lookup — needed by markOrderShippedAction to build the
// shipped email, which needs the full order (items, address), not just the
// id that markOrderShipped's status update touches.
export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapOrderRow(data as unknown as OrderRow) : null;
}

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
