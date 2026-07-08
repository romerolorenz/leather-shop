import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/route";
import { getProductBySlug, type Product } from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createdOrderIds: string[] = [];

let wallet: Product;
let tote: Product;

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

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const orderId of createdOrderIds) {
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
    await supabase.from("orders").delete().eq("id", orderId);
  }
});

describe("POST /api/orders", () => {
  it("rejects a non-Metro-Manila city", async () => {
    const walletVariant = wallet.variants.find((v) => v.label === "Chestnut Brown")!;
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Cebu City" },
        items: [
          { slug: "classic-bifold-wallet", variantId: walletVariant.id, quantity: 1 },
        ],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty cart", async () => {
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Pasig" },
        items: [],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects an order when the product is sold out (capacity is product-level, not per variant)", async () => {
    const toteVariant = tote.variants.find((v) => v.label === "Black")!;
    const supabase = getSupabaseServerClient();

    const { data: before } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", tote.id)
      .single();

    await supabase
      .from("products")
      .update({ stock_quantity: 0 })
      .eq("id", tote.id);

    try {
      const res = await POST(
        makeRequest({
          customer: { name: "Test", email: "t@example.com", phone: "123" },
          shippingAddress: { street: "1 St", city: "Pasig" },
          items: [{ slug: "tote-bag", variantId: toteVariant.id, quantity: 1 }],
        })
      );
      expect(res.status).toBe(400);
    } finally {
      await supabase
        .from("products")
        .update({ stock_quantity: before!.stock_quantity })
        .eq("id", tote.id);
    }
  });

  it("creates a valid order and prices it server-side", async () => {
    const walletVariant = wallet.variants.find((v) => v.label === "Chestnut Brown")!;
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "vitest-api@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Pasig" },
        items: [
          { slug: "classic-bifold-wallet", variantId: walletVariant.id, quantity: 1 },
        ],
      })
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    createdOrderIds.push(body.order.id);
    expect(body.order.totalCentavos).toBeGreaterThan(0);
    expect(body.order.status).toBe("pending_payment");
  });
});
