import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPromoCode, type PromoCodeInput } from "@/lib/promo-codes";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { assertPsgcSeeded, MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder as postOrder } from "./helpers/place-order";

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
  // POST /api/orders validates the address against PSGC (migration 0025).
  await assertPsgcSeeded();
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
  const errors = new CleanupErrors();
  // promo_code_redemptions.order_id has no ON DELETE behavior, so
  // redemptions must go before the orders they reference.
  for (const id of scratchPromoCodeIds) {
    errors.check(
      `delete redemptions of promo code ${id}`,
      await supabase.from("promo_code_redemptions").delete().eq("promo_code_id", id)
    );
  }
  await deleteOrdersRestoringStock(errors, scratchOrderIds);
  await deleteRowsById(errors, "promo_codes", scratchPromoCodeIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  errors.throwIfAny();
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

// Records the order for cleanup before the caller asserts anything.
function placeOrder(email: string, code?: string) {
  return postOrder(orderBody(email, code), scratchOrderIds);
}

function orderBody(email: string, code?: string) {
  return {
    customer: { name: "Vitest", email, phone: "123" },
    shippingAddress: {
      street: "1 Test St",
      ...MAKATI_BEL_AIR,
      postalCode: "1209",
    },
    items: [{ slug: productSlug, selectedOptions: {}, quantity: 1 }],
    promoCode: code,
  };
}

describe("POST /api/orders with a promo code", () => {
  it("applies the discount to the order total and records a redemption", async () => {
    const code = await makePromoCode({ usageLimitTotal: 10 });

    const { res, body } = await placeOrder("promo-buyer@example.com", code);
    expect(res.status).toBe(201);
    expect(body.order.discountCentavos).toBe(10000); // 10% of ₱1,000
    expect(body.order.promoCode).toBe(code);
    expect(body.order.totalCentavos).toBe(
      PRICE_CENTAVOS - 10000 + shippingCentavos
    );
  });

  it("rejects reusing a code the same customer already redeemed", async () => {
    const code = await makePromoCode({ usageLimitTotal: 10 });

    const first = await placeOrder("repeat@example.com", code);
    expect(first.res.status).toBe(201);

    const second = await placeOrder("repeat@example.com", code);
    expect(second.res.status).toBe(400);
  });

  it("allows the same customer to reuse a code with limitOnePerCustomer: false, up to the total cap", async () => {
    const code = await makePromoCode({
      usageLimitTotal: 2,
      limitOnePerCustomer: false,
    });

    const first = await placeOrder("reusable@example.com", code);
    expect(first.res.status).toBe(201);

    const second = await placeOrder("reusable@example.com", code);
    expect(second.res.status).toBe(201);

    const third = await placeOrder("reusable@example.com", code);
    expect(third.res.status).toBe(400);
  });

  it("rejects once the total usage cap is reached, even for a different customer", async () => {
    const code = await makePromoCode({ usageLimitTotal: 1 });

    const first = await placeOrder("first@example.com", code);
    expect(first.res.status).toBe(201);

    const second = await placeOrder("second@example.com", code);
    expect(second.res.status).toBe(400);
  });

  it("places the order normally when no promo code is given", async () => {
    const { res, body } = await placeOrder("no-promo@example.com");
    expect(res.status).toBe(201);
    expect(body.order.discountCentavos).toBe(0);
    expect(body.order.promoCode).toBeNull();
  });
});
