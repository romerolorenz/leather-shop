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
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder } from "./helpers/place-order";

// Input validation in POST /api/orders: a malformed body, the email
// format, whole-number quantities, and option types with no values being
// skipped (matching ProductDetail.tsx, docs/design/buy-now.md section 4). Uses its own scratch product (not the
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

// order_items.product_id has no cascade, so the orders (and the stock they
// took) go first, then the product and option types. Every failure is
// collected and the file fails at the end (helpers/cleanup.ts).
afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteOrdersRestoringStock(errors, scratchOrderIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  await deleteRowsById(errors, "option_types", scratchOptionTypeIds);
  errors.throwIfAny();
});

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

// Records any created order for cleanup before the caller asserts anything.
async function postOrder(body: unknown) {
  const { res, body: json } = await placeOrder(body, scratchOrderIds);
  return { res, json };
}

function rawRequest(body: string) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("POST /api/orders request checks", () => {
  it("returns a 400 with a message for a malformed JSON body", async () => {
    const res = await POST(rawRequest("{not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("returns a 400 for a body that isn't an object", async () => {
    const res = await POST(rawRequest("null"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toEqual(expect.any(String));
  });

  it("rejects an invalid email address", async () => {
    const body = orderBody({ selectedOptions: { [colorTypeName]: "Black" }, quantity: 1 });
    body.customer.email = "not-an-email";
    const { res, json } = await postOrder(body);
    expect(res.status).toBe(400);
    expect(json.error).toBe("Enter a valid email address.");
  });
});

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
