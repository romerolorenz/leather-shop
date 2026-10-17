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

// Cart-item validation in POST /api/orders: whole-number quantities, and
// option types with no values being skipped (matching ProductDetail.tsx,
// docs/design/buy-now.md section 4). Uses its own scratch product (not the
// seed products api-orders.test.ts needs) so it runs on the dev project.

const scratchProductIds: string[] = [];
const scratchOptionTypeIds: string[] = [];
const scratchOrderIds: string[] = [];
let productSlug: string;
let productName: string;
let colorTypeName: string;

beforeAll(async () => {
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
  const { data } = await supabase
    .from("products")
    .select("slug")
    .eq("id", productId)
    .single();
  productSlug = data!.slug;
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
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
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
  for (const id of scratchOptionTypeIds) {
    await supabase.from("option_types").delete().eq("id", id);
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
      barangay: "Test Barangay",
      city: "Pasig",
      postalCode: "1600",
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
    const { res } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Black" }, quantity: 0 })
    );
    expect(res.status).toBe(400);
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
    const { res } = await postOrder(
      orderBody({ selectedOptions: { [colorTypeName]: "Purple" }, quantity: 1 })
    );
    expect(res.status).toBe(400);
  });
});
