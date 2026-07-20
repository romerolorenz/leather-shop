import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/route";
import { createPromoCode, type PromoCodeInput } from "@/lib/promo-codes";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";

// End-to-end coverage for promo codes through the real order-creation path
// (not just validatePromoCode in isolation) — confirms the discount lands
// on the order row and that redemption is actually enforced, not just
// previewed. Runs against the real (dev) Supabase project with scratch
// products/promo codes so it never touches real catalog/promo data.

const PRICE_CENTAVOS = 100000; // ₱1,000

const scratchProductIds: string[] = [];
const scratchPromoCodeIds: string[] = [];
const scratchOrderIds: string[] = [];
let productSlug: string;
let shippingCentavos: number;

beforeAll(async () => {
  // Read the real, admin-configurable shipping fee rather than assuming
  // 0001_init.sql's default — /admin/settings may have changed it since.
  ({ shippingFeeCentavos: shippingCentavos } = await getSettings());
  const categoryId = await getOrCreateTestCategoryId();
  const input: ProductInput = {
    name: `Vitest Orders Promo Product ${Date.now()}`,
    description: "",
    categoryId,
    priceCentavos: PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 10,
  };
  const { id } = await createProduct(input);
  scratchProductIds.push(id);

  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", id)
    .single();
  productSlug = data!.slug;
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  // promo_code_redemptions.order_id has no ON DELETE behavior, so
  // redemptions must go before the orders they reference.
  for (const id of scratchPromoCodeIds) {
    await supabase.from("promo_code_redemptions").delete().eq("promo_code_id", id);
  }
  for (const orderId of scratchOrderIds) {
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
  for (const id of scratchPromoCodeIds) {
    await supabase.from("promo_codes").delete().eq("id", id);
  }
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
});

async function makePromoCode(overrides: Partial<PromoCodeInput> = {}) {
  const input: PromoCodeInput = {
    code: `VITESTORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
    discountPercent: 10,
    maxDiscountCentavos: 100000,
    minOrderValueCentavos: 0,
    usageLimitTotal: 1,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    categoryIds: [],
    limitOnePerCustomer: true,
    ...overrides,
  };
  const { id } = await createPromoCode(input);
  scratchPromoCodeIds.push(id);
  return input.code;
}

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function orderBody(email: string, code?: string) {
  return {
    customer: { name: "Vitest", email, phone: "123" },
    shippingAddress: { street: "1 Test St", city: "Pasig" },
    items: [{ slug: productSlug, selectedOptions: {}, quantity: 1 }],
    promoCode: code,
  };
}

describe("POST /api/orders with a promo code", () => {
  it("applies the discount to the order total and records a redemption", async () => {
    const code = await makePromoCode({ usageLimitTotal: 10 });

    const res = await POST(makeRequest(orderBody("promo-buyer@example.com", code)));
    expect(res.status).toBe(201);

    const body = await res.json();
    scratchOrderIds.push(body.order.id);

    expect(body.order.discountCentavos).toBe(10000); // 10% of ₱1,000
    expect(body.order.promoCode).toBe(code);
    expect(body.order.totalCentavos).toBe(
      PRICE_CENTAVOS - 10000 + shippingCentavos
    );
  });

  it("rejects reusing a code the same customer already redeemed", async () => {
    const code = await makePromoCode({ usageLimitTotal: 10 });

    const first = await POST(makeRequest(orderBody("repeat@example.com", code)));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    scratchOrderIds.push(firstBody.order.id);

    const second = await POST(makeRequest(orderBody("repeat@example.com", code)));
    expect(second.status).toBe(400);
  });

  it("allows the same customer to reuse a code with limitOnePerCustomer: false, up to the total cap", async () => {
    const code = await makePromoCode({
      usageLimitTotal: 2,
      limitOnePerCustomer: false,
    });

    const first = await POST(
      makeRequest(orderBody("reusable@example.com", code))
    );
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    scratchOrderIds.push(firstBody.order.id);

    const second = await POST(
      makeRequest(orderBody("reusable@example.com", code))
    );
    expect(second.status).toBe(201);
    const secondBody = await second.json();
    scratchOrderIds.push(secondBody.order.id);

    const third = await POST(
      makeRequest(orderBody("reusable@example.com", code))
    );
    expect(third.status).toBe(400);
  });

  it("rejects once the total usage cap is reached, even for a different customer", async () => {
    const code = await makePromoCode({ usageLimitTotal: 1 });

    const first = await POST(makeRequest(orderBody("first@example.com", code)));
    expect(first.status).toBe(201);
    const firstBody = await first.json();
    scratchOrderIds.push(firstBody.order.id);

    const second = await POST(makeRequest(orderBody("second@example.com", code)));
    expect(second.status).toBe(400);
  });

  it("places the order normally when no promo code is given", async () => {
    const res = await POST(makeRequest(orderBody("no-promo@example.com")));
    expect(res.status).toBe(201);
    const body = await res.json();
    scratchOrderIds.push(body.order.id);
    expect(body.order.discountCentavos).toBe(0);
    expect(body.order.promoCode).toBeNull();
  });
});
