import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getOrderById } from "@/lib/orders";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder as postOrder } from "./helpers/place-order";
import {
  assertPsgcSeeded,
  CEBU_CITY_LAHUG,
  MAKATI_BEL_AIR,
} from "./helpers/psgc-fixtures";

// Nationwide delivery through the real order route: any valid PSGC chain
// is accepted (no delivery-area list), inconsistent ones are rejected,
// and the order snapshots the names. Uses its own scratch product so it
// doesn't depend on 0001_init.sql's seed products.

const scratchProductIds: string[] = [];
const scratchOrderIds: string[] = [];
let productSlug: string;

beforeAll(async () => {
  await assertPsgcSeeded();
  const input: ProductInput = {
    name: `Vitest Nationwide Product ${Date.now()}`,
    description: "",
    categoryId: await getOrCreateTestCategoryId(),
    priceCentavos: 50000,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 10,
  };
  const { id } = await createProduct(input);
  scratchProductIds.push(id);
  const { data } = await getSupabaseServerClient()
    .from("products")
    .select("slug")
    .eq("id", id)
    .single();
  productSlug = data!.slug;
});

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteOrdersRestoringStock(errors, scratchOrderIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  errors.throwIfAny();
});

function placeOrder(location: Record<string, unknown>, postalCode = "6000") {
  return postOrder(
    {
      customer: { name: "Vitest", email: "vitest-nationwide@example.com", phone: "123" },
      shippingAddress: { street: "1 Test St", address2: "", postalCode, ...location },
      items: [{ slug: productSlug, selectedOptions: {}, quantity: 1 }],
    },
    scratchOrderIds
  );
}

describe("POST /api/orders, nationwide delivery", () => {
  it("accepts an address outside Metro Manila and snapshots its names", async () => {
    const { res, body } = await placeOrder(CEBU_CITY_LAHUG);
    expect(res.status).toBe(201);

    const stored = await getOrderById(body.order.id);
    expect(stored?.shippingAddress).toMatchObject({
      ...CEBU_CITY_LAHUG,
      region: "Region VII (Central Visayas)",
      province: "Cebu",
      city: "City of Cebu",
      barangay: "Lahug",
      postalCode: "6000",
    });
  });

  it("accepts a Metro Manila address with no province", async () => {
    const { res, body } = await placeOrder(
      { ...MAKATI_BEL_AIR, provinceCode: "" },
      "1209"
    );
    expect(res.status).toBe(201);
    const stored = await getOrderById(body.order.id);
    expect(stored?.shippingAddress).toMatchObject({
      provinceCode: null,
      province: "",
      city: "City of Makati",
    });
  });

  it("rejects an inconsistent chain without creating an order", async () => {
    const { res, body } = await placeOrder({
      ...CEBU_CITY_LAHUG,
      barangayCode: MAKATI_BEL_AIR.barangayCode,
    });
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/don't match/);
  });

  it("rejects the old free-text city/barangay shape", async () => {
    const { res } = await placeOrder({ city: "Cebu City", barangay: "Lahug" });
    expect(res.status).toBe(400);
  });

  it("ignores client-sent names in favour of the codes", async () => {
    const { res, body } = await placeOrder({
      ...CEBU_CITY_LAHUG,
      city: "Somewhere Else",
      barangay: "Fake",
    });
    expect(res.status).toBe(201);
    expect(body.order.shippingAddress.city).toBe("City of Cebu");
    expect(body.order.shippingAddress.barangay).toBe("Lahug");
  });
});
