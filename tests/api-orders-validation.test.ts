import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/route";
import {
  attachOptionToProduct,
  createOptionType,
  createOptionValue,
  createProduct,
} from "@/lib/admin/catalog";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { assertPsgcSeeded, MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";

// Cart-item validation in POST /api/orders: whole-number quantities, and
// option types with no values being skipped (matching ProductDetail.tsx,
// docs/design/buy-now.md section 4). Uses its own scratch product (not the
// seed products api-orders.test.ts needs) so it runs on the dev project.
// The shipping address is a real PSGC chain, so every request gets past
// the route's address check and reaches the item checks under test.

const scratchProductIds: string[] = [];
const scratchOptionTypeIds: string[] = [];
const scratchOrderIds: string[] = [];
let productSlug: string;
let productName: string;
let colorTypeName: string;

beforeAll(async () => {
  await assertPsgcSeeded();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  productName = `Vitest Orders Validation Product ${suffix}`;
  const { id: productId } = await createProduct({
    name: productName,
    description: "",
    categoryId: await getOrCreateTestCategoryId(),
    priceCentavos: 100000,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 10,
  });
  scratchProductIds.push(productId);

  // One option type with a value, and one attached with no values at all.
  colorTypeName = `Vitest Validation Color ${suffix}`;
  const { id: colorTypeId } = await createOptionType(colorTypeName, "buttons");
  scratchOptionTypeIds.push(colorTypeId);
  const { id: blackId } = await createOptionValue(colorTypeId, "Black");
  await attachOptionToProduct(productId, colorTypeId, [blackId]);

  const { id: emptyTypeId } = await createOptionType(
    `Vitest Validation Empty ${suffix}`,
    "buttons"
  );
  scratchOptionTypeIds.push(emptyTypeId);
  await attachOptionToProduct(productId, emptyTypeId, []);

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .single();
  if (error || !data) {
    throw new Error(
      `Couldn't read the scratch product's slug: ${error?.message ?? "no row"}`
    );
  }
  productSlug = data.slug;
});

// Every Supabase error is collected rather than ignored, and cleanup keeps
// going so one failure doesn't strand the rest; the file then fails at the
// end (same pattern as restoreSettings in helpers/settings-snapshot.ts).
// This matters because order_items.product_id has no cascade: an order
// delete that quietly fails also leaves the scratch product behind.
afterAll(async () => {
  const supabase = getSupabaseServerClient();
  const failures: string[] = [];
  const check = (what: string, error: { message: string } | null) => {
    if (error) failures.push(`${what}: ${error.message}`);
  };

  for (const orderId of scratchOrderIds) {
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", orderId);
    check(`read items of order ${orderId}`, itemsError);
    for (const item of items ?? []) {
      const { error } = await supabase.rpc("restore_product_stock", {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      });
      check(`restore stock for product ${item.product_id}`, error);
    }
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    check(`delete order ${orderId}`, error);
  }
  for (const id of scratchProductIds) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    check(`delete product ${id}`, error);
  }
  for (const id of scratchOptionTypeIds) {
    const { error } = await supabase.from("option_types").delete().eq("id", id);
    check(`delete option type ${id}`, error);
  }

  if (failures.length) {
    throw new Error(`api-orders-validation cleanup failed:\n${failures.join("\n")}`);
  }
});

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function orderBody(item: {
  selectedOptions: Record<string, string>;
  quantity: number;
}) {
  return {
    customer: {
      name: "Vitest",
      email: "orders-validation@example.com",
      phone: "123",
    },
    shippingAddress: {
      street: "1 Test St",
      address2: "",
      ...MAKATI_BEL_AIR,
      postalCode: "1209",
    },
    items: [{ slug: productSlug, ...item }],
  };
}

// Posts an order and records any created order for cleanup before the
// caller asserts anything.
async function postOrder(body: unknown) {
  const res = await POST(makeRequest(body));
  const json = await res.json();
  if (json.order?.id) scratchOrderIds.push(json.order.id);
  return { res, json };
}

describe("POST /api/orders cart-item validation", () => {
  it("rejects a fractional quantity", async () => {
    const { res, json } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Black" }, quantity: 1.5 })
    );
    expect(res.status).toBe(400);
    expect(json.error).toBe(
      `Quantity for ${productName} must be a whole number of 1 or more.`
    );
  });

  it("rejects a zero quantity", async () => {
    const { res, json } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Black" }, quantity: 0 })
    );
    expect(res.status).toBe(400);
    expect(json.error).toBe(
      `Quantity for ${productName} must be a whole number of 1 or more.`
    );
  });

  it("skips an option type with no values", async () => {
    const { res, json } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Black" }, quantity: 1 })
    );
    expect(res.status).toBe(201);
    expect(json.order.id).toBeTruthy();
  });

  it("still requires a value for an option type that has values", async () => {
    const { res, json } = await postOrder(
      orderBody({ selectedOptions: {}, quantity: 1 })
    );
    expect(res.status).toBe(400);
    expect(json.error).toBe(`Select a valid option for ${productName}.`);
  });

  it("still rejects an invalid value for an option type that has values", async () => {
    const { res, json } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Purple" }, quantity: 1 })
    );
    expect(res.status).toBe(400);
    expect(json.error).toBe(`Select a valid option for ${productName}.`);
  });
});
