import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/promo-codes/apply/route";
import { createPromoCode, type PromoCodeInput } from "@/lib/promo-codes";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project — HTTP-wiring coverage for
// POST /api/promo-codes/apply; validatePromoCode's own rules are covered
// in tests/promo-codes.test.ts.

const scratchProductIds: string[] = [];
const scratchPromoCodeIds: string[] = [];
let productSlug: string;
let promoCode: string;

beforeAll(async () => {
  const categoryId = await getOrCreateTestCategoryId();
  const input: ProductInput = {
    name: `Vitest Apply Route Product ${Date.now()}`,
    description: "",
    categoryId,
    priceCentavos: 20000,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 5,
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

  promoCode = `VITESTAPPLY${Date.now()}`;
  const promoInput: PromoCodeInput = {
    code: promoCode,
    discountPercent: 10,
    maxDiscountCentavos: 100000,
    minOrderValueCentavos: 0,
    usageLimitTotal: 100,
    startsAt: new Date(Date.now() - 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    active: true,
    categoryIds: [],
    limitOnePerCustomer: true,
  };
  const { id: promoId } = await createPromoCode(promoInput);
  scratchPromoCodeIds.push(promoId);
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of scratchPromoCodeIds) {
    await supabase.from("promo_codes").delete().eq("id", id);
  }
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/promo-codes/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/promo-codes/apply", () => {
  it("rejects an empty code", async () => {
    const res = await POST(
      makeRequest({ code: "", items: [{ slug: productSlug, quantity: 1 }] })
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty cart", async () => {
    const res = await POST(makeRequest({ code: "ANYTHING", items: [] }));
    expect(res.status).toBe(400);
  });

  it("rejects an item with an unknown slug", async () => {
    const res = await POST(
      makeRequest({
        code: "ANYTHING",
        items: [{ slug: "not-a-real-product-slug", quantity: 1 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("resolves the cart server-side and returns the computed discount for a valid code (case-insensitive)", async () => {
    const res = await POST(
      makeRequest({
        code: promoCode.toLowerCase(),
        items: [{ slug: productSlug, quantity: 2 }],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.discountCentavos).toBe(4000); // 10% of ₱400 (2x ₱200)
    expect(body.code).toBe(promoCode);
    expect(body.discountPercent).toBe(10);
    expect(body.maxDiscountCentavos).toBe(100000);
    expect(body.minOrderValueCentavos).toBe(0);
  });
});
