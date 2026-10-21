import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getPromoCodeForAdmin,
  listPromoCodesForAdmin,
  validatePromoCode,
  type PromoCodeInput,
} from "@/lib/promo-codes";
import { createCategory } from "@/lib/admin/categories";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CleanupErrors, deleteRowsById } from "./helpers/cleanup";

// Runs against the real (dev) Supabase project. Uses scratch categories,
// products, and promo codes so mutations here never touch real catalog or
// promo data.

const DAY_MS = 24 * 60 * 60 * 1000;
const yesterday = new Date(Date.now() - DAY_MS).toISOString();
const tomorrow = new Date(Date.now() + DAY_MS).toISOString();
const nextWeek = new Date(Date.now() + 7 * DAY_MS).toISOString();

// Every fixed code below gets this run's suffix, so a code left behind by
// an earlier run (or created by a parallel one) can't collide with or
// stand in for this run's.
const RUN_SUFFIX = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
const testCode = (name: string) => `VITEST${name}${RUN_SUFFIX}`;

const scratchPromoCodeIds: string[] = [];
const scratchProductIds: string[] = [];
const scratchCategoryIds: string[] = [];

let eligibleCategoryId: string;
let eligibleCategoryName: string;
let ineligibleCategoryId: string;
let eligibleProductId: string;
let eligibleProductCategoryId: string;
let ineligibleProductId: string;
let ineligibleProductCategoryId: string;
const scratchOrderIds: string[] = [];

const ELIGIBLE_PRICE_CENTAVOS = 10000; // ₱100
const INELIGIBLE_PRICE_CENTAVOS = 5000; // ₱50

beforeAll(async () => {
  eligibleCategoryName = `Vitest Promo Eligible ${Date.now()}`;
  eligibleCategoryId = await createCategoryScratch(eligibleCategoryName);
  ineligibleCategoryId = await createCategoryScratch(
    `Vitest Promo Ineligible ${Date.now()}`
  );

  const eligibleInput: ProductInput = {
    name: `Vitest Promo Eligible Product ${Date.now()}`,
    description: "",
    categoryId: eligibleCategoryId,
    priceCentavos: ELIGIBLE_PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 5,
  };
  const eligible = await createProduct(eligibleInput);
  eligibleProductId = eligible.id;
  eligibleProductCategoryId = eligibleCategoryId;
  scratchProductIds.push(eligibleProductId);

  const ineligibleInput: ProductInput = {
    name: `Vitest Promo Ineligible Product ${Date.now()}`,
    description: "",
    categoryId: ineligibleCategoryId,
    priceCentavos: INELIGIBLE_PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 5,
  };
  const ineligible = await createProduct(ineligibleInput);
  ineligibleProductId = ineligible.id;
  ineligibleProductCategoryId = ineligibleCategoryId;
  scratchProductIds.push(ineligibleProductId);
});

// This file accumulates a lot of scratch rows (one promo code per `it`,
// each needing two sequential deletes for its redemptions), which
// regularly blew past vitest's default 10s hook timeout — the hook then
// gets killed mid-cleanup, leaving orphaned "VITEST*"/"Vitest Promo *"
// rows in the dev DB on every run that hit it. Passing an explicit
// timeout here lets the full cleanup actually finish instead.
afterAll(async () => {
  const supabase = getSupabaseServerClient();
  const errors = new CleanupErrors();
  for (const id of scratchPromoCodeIds) {
    // Redemptions first: their FKs to promo_codes and orders have no
    // ON DELETE behavior.
    const redemptionsGone = errors.check(
      `delete redemptions of promo code ${id}`,
      await supabase.from("promo_code_redemptions").delete().eq("promo_code_id", id)
    );
    if (redemptionsGone) await deleteRowsById(errors, "promo_codes", [id]);
  }
  // Scratch orders here are bare rows that never took stock, so a plain
  // delete is right (no restore).
  await deleteRowsById(errors, "orders", scratchOrderIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  await deleteRowsById(errors, "categories", scratchCategoryIds);
  errors.throwIfAny();
}, 30000);

// A minimal real order row — promo_code_redemptions.order_id is a required
// FK, so exercising the delete-guard needs a real referenced order, not
// just a random uuid.
async function makeScratchOrder(): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name: "Vitest",
      customer_email: "vitest-promo-order@example.com",
      customer_phone: "123",
      shipping_street: "1 Test St",
      shipping_city: "Pasig",
      subtotal_centavos: ELIGIBLE_PRICE_CENTAVOS,
      shipping_centavos: 0,
      total_centavos: ELIGIBLE_PRICE_CENTAVOS,
    })
    .select("id")
    .single();
  if (error) throw error;
  scratchOrderIds.push(data.id);
  return data.id;
}

// The id comes back from the insert itself and is queued for cleanup
// before anything else (a later read) can throw.
async function createCategoryScratch(name: string): Promise<string> {
  const { id } = await createCategory(name);
  scratchCategoryIds.push(id);
  return id;
}

function baseInput(overrides: Partial<PromoCodeInput> = {}): PromoCodeInput {
  return {
    code: `VITEST${Date.now()}${Math.floor(Math.random() * 1000)}`,
    discountPercent: 10,
    maxDiscountCentavos: 100000,
    minOrderValueCentavos: 0,
    usageLimitTotal: 100,
    startsAt: yesterday,
    expiresAt: nextWeek,
    active: true,
    categoryIds: [],
    limitOnePerCustomer: true,
    ...overrides,
  };
}

async function makePromoCode(
  overrides: Partial<PromoCodeInput> = {}
): Promise<string> {
  const { id } = await createPromoCode(baseInput(overrides));
  scratchPromoCodeIds.push(id);
  return id;
}

describe("promo code admin CRUD", () => {
  it("creates, reads, updates, and deletes a promo code", async () => {
    const id = await makePromoCode({ code: testCode("CRUD") });

    const created = await getPromoCodeForAdmin(id);
    expect(created?.code).toBe(testCode("CRUD"));
    expect(created?.discountPercent).toBe(10);

    await updatePromoCode(id, baseInput({ code: testCode("CRUD"), discountPercent: 25 }));
    const updated = await getPromoCodeForAdmin(id);
    expect(updated?.discountPercent).toBe(25);

    expect((await listPromoCodesForAdmin()).map((p) => p.id)).toContain(id);

    await deletePromoCode(id);
    scratchPromoCodeIds.splice(scratchPromoCodeIds.indexOf(id), 1);
    expect(await getPromoCodeForAdmin(id)).toBeUndefined();
  });

  it("stores and returns category restrictions", async () => {
    const id = await makePromoCode({ categoryIds: [eligibleCategoryId] });
    const promo = await getPromoCodeForAdmin(id);
    expect(promo?.categoryIds).toEqual([eligibleCategoryId]);
  });

  it("refuses to delete a promo code that has been redeemed", async () => {
    const id = await makePromoCode();
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "redeemed@example.com",
      order_id: orderId,
    });

    await expect(deletePromoCode(id)).rejects.toThrow(/already been redeemed/);
  });
});

describe("validatePromoCode", () => {
  it("returns invalid for a code that doesn't exist", async () => {
    const result = await validatePromoCode("NOPE-DOES-NOT-EXIST", {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
  });

  it("applies a flat percent discount to the whole subtotal when unrestricted", async () => {
    await makePromoCode({ code: testCode("FLAT10"), discountPercent: 10 });

    const result = await validatePromoCode(testCode("FLAT10").toLowerCase(), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.discountCentavos).toBe(1000);
      expect(result.restrictedToCategoryNames).toBeNull();
    }
  });

  it("caps the discount at max_discount_centavos", async () => {
    await makePromoCode({
      code: testCode("CAP"),
      discountPercent: 90,
      maxDiscountCentavos: 500,
    });

    const result = await validatePromoCode(testCode("CAP"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
    });

    expect(result.valid).toBe(true);
    if (result.valid) expect(result.discountCentavos).toBe(500);
  });

  it("rejects an inactive code", async () => {
    await makePromoCode({ code: testCode("INACTIVE"), active: false });
    const result = await validatePromoCode(testCode("INACTIVE"), {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/no longer active/);
  });

  it("rejects a code before its start date", async () => {
    await makePromoCode({ code: testCode("FUTURE"), startsAt: tomorrow });
    const result = await validatePromoCode(testCode("FUTURE"), {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/not active yet|isn't active yet/);
  });

  it("rejects an expired code", async () => {
    await makePromoCode({
      code: testCode("EXPIRED"),
      startsAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      expiresAt: yesterday,
    });
    const result = await validatePromoCode(testCode("EXPIRED"), {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/expired/);
  });

  it("rejects an order below the minimum order value", async () => {
    await makePromoCode({
      code: testCode("MINORDER"),
      minOrderValueCentavos: 1000000,
    });
    const result = await validatePromoCode(testCode("MINORDER"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/minimum order/);
  });

  it("checks minimum order value against the whole cart even when category-restricted", async () => {
    await makePromoCode({
      code: testCode("MINWHOLE"),
      categoryIds: [eligibleCategoryId],
      minOrderValueCentavos: ELIGIBLE_PRICE_CENTAVOS + INELIGIBLE_PRICE_CENTAVOS,
    });

    // Whole-cart subtotal meets the minimum even though only the eligible
    // item's price alone wouldn't.
    const result = await validatePromoCode(testCode("MINWHOLE"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
        {
          productId: ineligibleProductId,
          categoryId: ineligibleProductCategoryId,
          lineTotalCentavos: INELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS + INELIGIBLE_PRICE_CENTAVOS,
    });

    expect(result.valid).toBe(true);
  });

  it("discounts only the eligible items' subtotal for a category-restricted code (Option B)", async () => {
    await makePromoCode({
      code: testCode("PARTIAL"),
      discountPercent: 20,
      categoryIds: [eligibleCategoryId],
    });

    const result = await validatePromoCode(testCode("PARTIAL"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
        {
          productId: ineligibleProductId,
          categoryId: ineligibleProductCategoryId,
          lineTotalCentavos: INELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS + INELIGIBLE_PRICE_CENTAVOS,
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      // 20% of just the ₱100 eligible item, not the ₱150 combined cart.
      expect(result.discountCentavos).toBe(2000);
      expect(result.restrictedToCategoryNames).toEqual([eligibleCategoryName]);
    }
  });

  it("rejects a category-restricted code when the cart has no eligible items", async () => {
    await makePromoCode({
      code: testCode("NOMATCH"),
      categoryIds: [eligibleCategoryId],
    });

    const result = await validatePromoCode(testCode("NOMATCH"), {
      cartItems: [
        {
          productId: ineligibleProductId,
          categoryId: ineligibleProductCategoryId,
          lineTotalCentavos: INELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: INELIGIBLE_PRICE_CENTAVOS,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/none of those are in your cart/);
  });

  it("rejects a customer who has already redeemed the code", async () => {
    const id = await makePromoCode({ code: testCode("ONCE") });
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "used@example.com",
      order_id: orderId,
    });
    if (error) throw error;

    const result = await validatePromoCode(testCode("ONCE"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
      customerEmail: "used@example.com",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/already used/);
  });

  it("allows a customer to reuse a code with limitOnePerCustomer: false", async () => {
    const id = await makePromoCode({
      code: testCode("REUSE"),
      limitOnePerCustomer: false,
    });
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "repeat-user@example.com",
      order_id: orderId,
    });
    if (error) throw error;

    const result = await validatePromoCode(testCode("REUSE"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
      customerEmail: "repeat-user@example.com",
    });

    expect(result.valid).toBe(true);
  });

  it("rejects once the total usage cap is reached", async () => {
    const id = await makePromoCode({ code: testCode("CAPPED"), usageLimitTotal: 1 });
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "first-redeemer@example.com",
      order_id: orderId,
    });
    if (error) throw error;

    const result = await validatePromoCode(testCode("CAPPED"), {
      cartItems: [
        {
          productId: eligibleProductId,
          categoryId: eligibleProductCategoryId,
          lineTotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
        },
      ],
      subtotalCentavos: ELIGIBLE_PRICE_CENTAVOS,
      customerEmail: "someone-else@example.com",
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/fully redeemed/);
  });
});
