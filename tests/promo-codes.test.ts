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
import { createCategory, listCategories } from "@/lib/admin/categories";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project. Uses scratch categories,
// products, and promo codes so mutations here never touch real catalog or
// promo data.

const DAY_MS = 24 * 60 * 60 * 1000;
const yesterday = new Date(Date.now() - DAY_MS).toISOString();
const tomorrow = new Date(Date.now() + DAY_MS).toISOString();
const nextWeek = new Date(Date.now() + 7 * DAY_MS).toISOString();

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
  for (const id of scratchPromoCodeIds) {
    await supabase.from("promo_code_redemptions").delete().eq("promo_code_id", id);
    await supabase.from("promo_codes").delete().eq("id", id);
  }
  for (const id of scratchOrderIds) {
    await supabase.from("orders").delete().eq("id", id);
  }
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
  for (const id of scratchCategoryIds) {
    await supabase.from("categories").delete().eq("id", id);
  }
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

async function createCategoryScratch(name: string): Promise<string> {
  await createCategory(name);
  const categories = await listCategories();
  const created = categories.find((c) => c.name === name);
  if (!created) throw new Error(`Category "${name}" wasn't created`);
  scratchCategoryIds.push(created.id);
  return created.id;
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
    const id = await makePromoCode({ code: "VITESTCRUD" });

    const created = await getPromoCodeForAdmin(id);
    expect(created?.code).toBe("VITESTCRUD");
    expect(created?.discountPercent).toBe(10);

    await updatePromoCode(id, baseInput({ code: "VITESTCRUD", discountPercent: 25 }));
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
    await makePromoCode({ code: "VITESTFLAT10", discountPercent: 10 });

    const result = await validatePromoCode("vitestflat10", {
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
      code: "VITESTCAP",
      discountPercent: 90,
      maxDiscountCentavos: 500,
    });

    const result = await validatePromoCode("VITESTCAP", {
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
    await makePromoCode({ code: "VITESTINACTIVE", active: false });
    const result = await validatePromoCode("VITESTINACTIVE", {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/no longer active/);
  });

  it("rejects a code before its start date", async () => {
    await makePromoCode({ code: "VITESTFUTURE", startsAt: tomorrow });
    const result = await validatePromoCode("VITESTFUTURE", {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/not active yet|isn't active yet/);
  });

  it("rejects an expired code", async () => {
    await makePromoCode({
      code: "VITESTEXPIRED",
      startsAt: new Date(Date.now() - 2 * DAY_MS).toISOString(),
      expiresAt: yesterday,
    });
    const result = await validatePromoCode("VITESTEXPIRED", {
      cartItems: [],
      subtotalCentavos: 0,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toMatch(/expired/);
  });

  it("rejects an order below the minimum order value", async () => {
    await makePromoCode({
      code: "VITESTMINORDER",
      minOrderValueCentavos: 1000000,
    });
    const result = await validatePromoCode("VITESTMINORDER", {
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
      code: "VITESTMINWHOLE",
      categoryIds: [eligibleCategoryId],
      minOrderValueCentavos: ELIGIBLE_PRICE_CENTAVOS + INELIGIBLE_PRICE_CENTAVOS,
    });

    // Whole-cart subtotal meets the minimum even though only the eligible
    // item's price alone wouldn't.
    const result = await validatePromoCode("VITESTMINWHOLE", {
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
      code: "VITESTPARTIAL",
      discountPercent: 20,
      categoryIds: [eligibleCategoryId],
    });

    const result = await validatePromoCode("VITESTPARTIAL", {
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
      code: "VITESTNOMATCH",
      categoryIds: [eligibleCategoryId],
    });

    const result = await validatePromoCode("VITESTNOMATCH", {
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
    const id = await makePromoCode({ code: "VITESTONCE" });
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "used@example.com",
      order_id: orderId,
    });
    if (error) throw error;

    const result = await validatePromoCode("VITESTONCE", {
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
      code: "VITESTREUSE",
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

    const result = await validatePromoCode("VITESTREUSE", {
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
    const id = await makePromoCode({ code: "VITESTCAPPED", usageLimitTotal: 1 });
    const orderId = await makeScratchOrder();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("promo_code_redemptions").insert({
      promo_code_id: id,
      customer_email: "first-redeemer@example.com",
      order_id: orderId,
    });
    if (error) throw error;

    const result = await validatePromoCode("VITESTCAPPED", {
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
