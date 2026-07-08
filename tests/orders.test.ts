import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  cancelOrderAndRestoreStock,
  createOrder,
  getExpiredPendingOrderIds,
  listOrdersForCustomer,
  InsufficientStockError,
  type NewOrder,
  type NewOrderItem,
} from "@/lib/orders";
import { getProductBySlug, type Product } from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project — there's no separate test
// database. Every test cleans up any order/stock change it makes so the
// seed data is left exactly as it found it.

let wallet: Product;
let tote: Product;

const cleanupOrderIds: string[] = [];

beforeAll(async () => {
  const [w, t] = await Promise.all([
    getProductBySlug("classic-bifold-wallet"),
    getProductBySlug("tote-bag"),
  ]);
  if (!w || !t) {
    throw new Error(
      "Seed data missing — run supabase/migrations/0001_init.sql first."
    );
  }
  wallet = w;
  tote = t;
});

afterEach(async () => {
  const supabase = getSupabaseServerClient();
  for (const orderId of cleanupOrderIds.splice(0)) {
    // A test that already cancelled the order (via cancelOrderAndRestoreStock)
    // has already restored its stock — restoring again here would double it.
    const { data: orderRow } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderRow && orderRow.status !== "cancelled") {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);
      for (const item of items ?? []) {
        await supabase.rpc("restore_product_stock", {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }
    }
    await supabase.from("orders").delete().eq("id", orderId);
  }
});

function walletItem(
  quantity: number,
  colorValue = "Chestnut Brown"
): NewOrderItem {
  return {
    slug: wallet.slug,
    name: wallet.name,
    options: [{ optionTypeName: "Color", optionValue: colorValue }],
    quantity,
    priceCentavos: wallet.priceCentavos,
    productId: wallet.id,
  };
}

function toteItem(quantity: number, colorValue = "Chestnut Brown"): NewOrderItem {
  return {
    slug: tote.slug,
    name: tote.name,
    options: [{ optionTypeName: "Color", optionValue: colorValue }],
    quantity,
    priceCentavos: tote.priceCentavos,
    productId: tote.id,
  };
}

function buildOrder(
  items: NewOrder["items"],
  overrides: Partial<NewOrder["customer"]> = {}
): NewOrder {
  const subtotalCentavos = items.reduce(
    (sum, item) => sum + item.priceCentavos * item.quantity,
    0
  );
  const shippingCentavos = 15000;
  return {
    customer: {
      name: "Vitest",
      email: "vitest@example.com",
      phone: "123",
      ...overrides,
    },
    shippingAddress: { street: "1 Test St", city: "Pasig" },
    items,
    subtotalCentavos,
    shippingCentavos,
    totalCentavos: subtotalCentavos + shippingCentavos,
  };
}

describe("createOrder", () => {
  it("decrements stock by exactly the ordered quantity and records selected options", async () => {
    const supabase = getSupabaseServerClient();
    const { data: before } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    const order = await createOrder(buildOrder([walletItem(1)]));
    cleanupOrderIds.push(order.id);

    const { data: after } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    expect(after!.stock_quantity).toBe(before!.stock_quantity - 1);
    expect(order.status).toBe("pending_payment");
    expect(order.totalCentavos).toBe(wallet.priceCentavos + 15000);
    expect(order.items[0].options).toEqual([
      { optionTypeName: "Color", optionValue: "Chestnut Brown" },
    ]);
  });

  it("throws InsufficientStockError and leaves no order behind when quantity exceeds stock", async () => {
    await expect(createOrder(buildOrder([walletItem(9999)]))).rejects.toThrow(
      InsufficientStockError
    );

    const supabase = getSupabaseServerClient();
    const { data: orders } = await supabase
      .from("orders")
      .select("id")
      .eq("customer_email", "vitest@example.com");
    expect(orders).toEqual([]);
  });

  it("rolls back an earlier item's decrement when a later item lacks stock", async () => {
    const supabase = getSupabaseServerClient();
    const { data: before } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    await expect(
      createOrder(
        buildOrder([
          walletItem(1),
          // Comfortably exceeds seeded product-level capacity (5) without
          // overflowing the integer subtotal column the way 9999 would.
          toteItem(50),
        ])
      )
    ).rejects.toThrow(InsufficientStockError);

    const { data: after } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    expect(after!.stock_quantity).toBe(before!.stock_quantity);
  });
});

describe("cancelOrderAndRestoreStock", () => {
  it("cancels a pending order and restores its stock", async () => {
    const order = await createOrder(buildOrder([walletItem(1)]));
    cleanupOrderIds.push(order.id);

    const supabase = getSupabaseServerClient();
    const { data: decremented } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    const wasCancelled = await cancelOrderAndRestoreStock(order.id);
    expect(wasCancelled).toBe(true);

    const { data: restored } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();
    expect(restored!.stock_quantity).toBe(decremented!.stock_quantity + 1);

    const { data: orderRow } = await supabase
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(orderRow!.status).toBe("cancelled");
  });

  it("returns false and doesn't touch stock for an order that's already paid", async () => {
    const order = await createOrder(buildOrder([walletItem(1)]));
    cleanupOrderIds.push(order.id);

    const supabase = getSupabaseServerClient();
    await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order.id);

    const { data: beforeCancel } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();

    const wasCancelled = await cancelOrderAndRestoreStock(order.id);
    expect(wasCancelled).toBe(false);

    const { data: afterCancel } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", wallet.id)
      .single();
    expect(afterCancel!.stock_quantity).toBe(beforeCancel!.stock_quantity);
  });
});

describe("getExpiredPendingOrderIds", () => {
  it("finds an order past the hold window and excludes it at a longer window", async () => {
    const order = await createOrder(buildOrder([walletItem(1)]));
    cleanupOrderIds.push(order.id);

    const supabase = getSupabaseServerClient();
    const backdated = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();
    await supabase
      .from("orders")
      .update({ created_at: backdated })
      .eq("id", order.id);

    expect(await getExpiredPendingOrderIds(48)).toContain(order.id);
    expect(await getExpiredPendingOrderIds(72)).not.toContain(order.id);
  });
});

describe("listOrdersForCustomer", () => {
  it("only returns orders matching the given customer email", async () => {
    const mine = await createOrder(
      buildOrder([walletItem(1)], { email: "vitest-account@example.com" })
    );
    cleanupOrderIds.push(mine.id);
    const theirs = await createOrder(
      buildOrder([walletItem(1)], { email: "vitest@example.com" })
    );
    cleanupOrderIds.push(theirs.id);

    const results = await listOrdersForCustomer("vitest-account@example.com");
    expect(results.map((o) => o.id)).toContain(mine.id);
    expect(results.map((o) => o.id)).not.toContain(theirs.id);
  });
});
