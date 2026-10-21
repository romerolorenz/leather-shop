import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { createPromoCode } from "@/lib/promo-codes";
import { getSettings } from "@/lib/settings";
import { formatAddressLines } from "@/lib/address-format";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { assertPsgcSeeded, CEBU_CITY_LAHUG } from "./helpers/psgc-fixtures";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder } from "./helpers/place-order";

// The checkout "Order placed" screen (docs/design/order-success.md) renders
// only from the `order` POST /api/orders returns, since the cart is
// cleared by then. This pins down that the response carries everything the
// screen shows, server-priced. Runs against the real (dev) Supabase
// project with a scratch product, option-free, and a scratch promo code.

const PRICE_CENTAVOS = 150000; // ₱1,500

const scratchProductIds: string[] = [];
const scratchPromoCodeIds: string[] = [];
const scratchOrderIds: string[] = [];
let productSlug: string;
let productName: string;
let shippingCentavos: number;

beforeAll(async () => {
  await assertPsgcSeeded();
  ({ shippingFeeCentavos: shippingCentavos } = await getSettings());
  const input: ProductInput = {
    name: `Vitest Order Response Product ${Date.now()}`,
    description: "",
    categoryId: await getOrCreateTestCategoryId(),
    priceCentavos: PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 10,
  };
  const { id } = await createProduct(input);
  scratchProductIds.push(id);
  productName = input.name;

  const { data, error } = await getSupabaseServerClient()
    .from("products")
    .select("slug")
    .eq("id", id)
    .single();
  if (error) throw error;
  productSlug = data.slug;
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  const errors = new CleanupErrors();
  // Redemptions reference the orders (no ON DELETE), so they go first.
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

function orderBody(promoCode?: string) {
  return {
    customer: {
      name: "  Ana Santos ",
      email: "Order-Response@Example.com",
      phone: "0917 123 4567",
    },
    shippingAddress: {
      street: "12 Mabini Street",
      address2: "Unit 3B",
      ...CEBU_CITY_LAHUG,
      postalCode: "6000",
    },
    items: [{ slug: productSlug, selectedOptions: {}, quantity: 2 }],
    promoCode,
  };
}

describe("POST /api/orders response (what the success screen renders)", () => {
  it("returns the placed order with items, totals, customer and address", async () => {
    const { res, body } = await placeOrder(orderBody(), scratchOrderIds);
    expect(res.status).toBe(201);

    const order = body.order;
    expect(typeof order.id).toBe("string");
    expect(order.customer).toEqual({
      name: "Ana Santos",
      email: "order-response@example.com",
      phone: "0917 123 4567",
    });
    expect(order.items).toEqual([
      expect.objectContaining({
        slug: productSlug,
        name: productName,
        options: [],
        quantity: 2,
        priceCentavos: PRICE_CENTAVOS,
      }),
    ]);
    expect(order.subtotalCentavos).toBe(PRICE_CENTAVOS * 2);
    expect(order.shippingCentavos).toBe(shippingCentavos);
    expect(order.promoCode).toBeNull();
    expect(order.discountCentavos).toBe(0);
    expect(order.totalCentavos).toBe(PRICE_CENTAVOS * 2 + shippingCentavos);

    // Names resolved server-side from the PSGC codes, in the shape the
    // shared address formatter takes.
    expect(order.shippingAddress).toMatchObject({
      street: "12 Mabini Street",
      address2: "Unit 3B",
      postalCode: "6000",
    });
    const lines = formatAddressLines(order.shippingAddress);
    expect(lines[0]).toBe("12 Mabini Street, Unit 3B");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toMatch(/Lahug/);
    expect(lines[1]).toMatch(/Cebu/);
    expect(lines[2]).toMatch(/6000$/);
  });

  it("includes the promo code and discount when one was used", async () => {
    const code = `VITESTRESP${Date.now()}`;
    const { id } = await createPromoCode({
      code,
      discountPercent: 10,
      maxDiscountCentavos: 1000000,
      minOrderValueCentavos: 0,
      usageLimitTotal: 5,
      startsAt: new Date(Date.now() - 86400000).toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      active: true,
      categoryIds: [],
      limitOnePerCustomer: false,
    });
    scratchPromoCodeIds.push(id);

    const { res, body } = await placeOrder(orderBody(code), scratchOrderIds);
    expect(res.status).toBe(201);
    expect(body.order.promoCode).toBe(code);
    expect(body.order.discountCentavos).toBe(30000); // 10% of ₱3,000
    expect(body.order.totalCentavos).toBe(
      PRICE_CENTAVOS * 2 - 30000 + shippingCentavos
    );
  });
});
