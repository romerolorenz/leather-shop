import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getProductBySlug, type Product } from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CleanupErrors, deleteOrdersRestoringStock } from "./helpers/cleanup";
import { placeOrder } from "./helpers/place-order";
import { MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";

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

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteOrdersRestoringStock(errors, createdOrderIds);
  errors.throwIfAny();
});

describe("POST /api/orders", () => {
  // Nationwide acceptance and chain mismatches are covered in
  // tests/api-orders-nationwide.test.ts; this just checks that an address
  // without PSGC codes (the old free-text shape) is refused.
  it("rejects an address without PSGC codes", async () => {
    const { res } = await placeOrder(
      {
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: {
          street: "1 St",
          barangay: "Test Barangay",
          city: "Cebu City",
          postalCode: "6000",
        },
        items: [
          {
            slug: wallet.slug,
            selectedOptions: { Color: "Chestnut Brown" },
            quantity: 1,
          },
        ],
      },
      createdOrderIds
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty cart", async () => {
    const { res } = await placeOrder(
      {
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: {
          street: "1 St",
          ...MAKATI_BEL_AIR,
          postalCode: "1209",
        },
        items: [],
      },
      createdOrderIds
    );
    expect(res.status).toBe(400);
  });

  it("rejects an option selection that isn't one of the product's values", async () => {
    const { res } = await placeOrder(
      {
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: {
          street: "1 St",
          ...MAKATI_BEL_AIR,
          postalCode: "1209",
        },
        items: [
          {
            slug: wallet.slug,
            selectedOptions: { Color: "Not A Real Color" },
            quantity: 1,
          },
        ],
      },
      createdOrderIds
    );
    expect(res.status).toBe(400);
  });

  it("rejects an order when the product is sold out (capacity is product-level, not per option combination)", async () => {
    const supabase = getSupabaseServerClient();

    const before = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", tote.id)
      .single();
    if (before.error) throw before.error;

    const zeroed = await supabase
      .from("products")
      .update({ stock_quantity: 0 })
      .eq("id", tote.id);
    const orderIds: string[] = [];
    // The finally restores stock even if this update reported an error,
    // since a failed request may still have applied.
    try {
      if (zeroed.error) throw zeroed.error;
      const { res } = await placeOrder(
        {
          customer: { name: "Test", email: "t@example.com", phone: "123" },
          shippingAddress: {
            street: "1 St",
            ...MAKATI_BEL_AIR,
            postalCode: "1209",
          },
          items: [
            {
              slug: tote.slug,
              selectedOptions: { Color: "Black" },
              quantity: 1,
            },
          ],
        },
        orderIds
      );
      expect(res.status).toBe(400);
    } finally {
      // An order that wrongly went through is removed first, so the stock
      // reset below is the last word on tote's stock.
      const errors = new CleanupErrors();
      await deleteOrdersRestoringStock(errors, orderIds);
      errors.check(
        "restore tote stock",
        await supabase
          .from("products")
          .update({ stock_quantity: before.data.stock_quantity })
          .eq("id", tote.id)
      );
      errors.throwIfAny();
    }
  });

  it("creates a valid order and prices it server-side", async () => {
    const { res, body } = await placeOrder(
      {
        customer: { name: "Test", email: "vitest-api@example.com", phone: "123" },
        shippingAddress: {
          street: "1 St",
          ...MAKATI_BEL_AIR,
          postalCode: "1209",
        },
        items: [
          {
            slug: wallet.slug,
            selectedOptions: { Color: "Chestnut Brown" },
            quantity: 1,
          },
        ],
      },
      createdOrderIds
    );
    expect(res.status).toBe(201);
    expect(body.order.totalCentavos).toBeGreaterThan(0);
    expect(body.order.status).toBe("pending_payment");
    expect(body.order.items[0].options).toEqual([
      { optionTypeName: "Color", optionValue: "Chestnut Brown" },
    ]);
  });
});
