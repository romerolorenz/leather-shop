import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createProduct, getProductForAdmin, updateProduct } from "@/lib/admin/catalog";
import { getProductBySlug } from "@/lib/products";
import { createOrder, type NewOrder } from "@/lib/orders";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { assertPsgcSeeded, MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder } from "./helpers/place-order";

// Custom requests (docs/design/custom-requests.md, migration 0029) end to
// end through POST /api/orders and create_order(): the note is stored on
// the order item with the product's label, too-long notes are refused, a
// note still goes through when the product's requests were switched off
// after add-to-cart (decision F), and the database checks back it all up.
// Uses its own scratch products (not the seed products), so it runs on
// dev. Every order is recorded for cleanup before anything is asserted
// (helpers/place-order.ts).

const PRICE_CENTAVOS = 100000;
const DEFAULT_HELP =
  "Thread colour, strap length, a small change — tell us what you'd like.";

const scratchProductIds: string[] = [];
const scratchOrderIds: string[] = [];
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const email = `custom-request-${runId}@example.com`;

let enabled: { id: string; slug: string; name: string };
let disabled: { id: string; slug: string; name: string };

async function makeProduct(
  label: string,
  customRequest: { enabled: boolean; label?: string }
) {
  const name = `Vitest Custom Request ${label} ${runId}`;
  const { id } = await createProduct({
    name,
    description: "",
    categoryId: await getOrCreateTestCategoryId(),
    priceCentavos: PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 20,
    // Left out for the "disabled" product, like the quick-create modal, so
    // it gets the database defaults.
    ...(customRequest.enabled
      ? {
          customRequestEnabled: true,
          customRequestLabel: customRequest.label ?? null,
          customRequestHelp: "Tell us.",
        }
      : {}),
  });
  scratchProductIds.push(id);
  const product = await getProductForAdmin(id);
  if (!product) throw new Error(`Scratch product ${id} wasn't found`);
  return { id, slug: product.slug, name };
}

beforeAll(async () => {
  await assertPsgcSeeded();
  enabled = await makeProduct("On", { enabled: true, label: "Make it yours" });
  disabled = await makeProduct("Off", { enabled: false });
});

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteOrdersRestoringStock(errors, scratchOrderIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  errors.throwIfAny();
}, 60_000);

function orderBody(items: { slug: string; customRequest?: unknown; customRequestLabel?: unknown }[]) {
  return {
    customer: { name: "Vitest", email, phone: "0917 000 0000" },
    shippingAddress: {
      street: "1 Test St",
      address2: "",
      ...MAKATI_BEL_AIR,
      postalCode: "1209",
    },
    items: items.map((item) => ({ selectedOptions: {}, quantity: 1, ...item })),
  };
}

async function storedItems(orderId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("order_items")
    .select("product_id, custom_request_label, custom_request_note")
    .eq("order_id", orderId);
  if (error) throw error;
  return data;
}

async function countOrders() {
  const { count, error } = await getSupabaseServerClient()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_email", email);
  if (error) throw error;
  return count;
}

describe("product columns and settings (migration 0029)", () => {
  it("exposes the per-product toggle, label and helper on the storefront product", async () => {
    const on = await getProductBySlug(enabled.slug);
    expect(on).toMatchObject({
      customRequestEnabled: true,
      customRequestLabel: "Make it yours",
      customRequestHelp: "Tell us.",
    });
  });

  it("defaults a new product to off, the default label and the default helper copy", async () => {
    const off = await getProductBySlug(disabled.slug);
    expect(off).toMatchObject({
      customRequestEnabled: false,
      customRequestLabel: "Special request",
      customRequestHelp: DEFAULT_HELP,
    });
  });

  it("seeds the shop-wide custom_request_note setting", async () => {
    const { data, error } = await getSupabaseServerClient()
      .from("settings")
      .select("value")
      .eq("key", "custom_request_note")
      .maybeSingle();
    expect(error).toBeNull();
    expect(typeof data?.value).toBe("string");
  });

  it("rejects a label over 40 characters at the database too", async () => {
    await expect(
      updateProduct(enabled.id, {
        name: enabled.name,
        description: "",
        categoryId: await getOrCreateTestCategoryId(),
        priceCentavos: PRICE_CENTAVOS,
        leadTimeDays: 1,
        orderingEnabled: true,
        visible: true,
        stockQuantity: 20,
        customRequestLabel: "a".repeat(41),
      })
    ).rejects.toMatchObject({ code: "23514" });
  });
});

describe("POST /api/orders with a special request", () => {
  it("stores the normalised note with the product's label, ignoring a client label", async () => {
    const { res, body } = await placeOrder(
      orderBody([
        {
          slug: enabled.slug,
          customRequest: "  Navy thread\r\n\r\n\r\nstrap 2 cm longer ",
          customRequestLabel: "Sent by the client",
        },
      ]),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    expect(body.order.items[0]).toMatchObject({
      customRequestLabel: "Make it yours",
      customRequestNote: "Navy thread\n\nstrap 2 cm longer",
    });
    expect(await storedItems(body.order.id)).toEqual([
      {
        product_id: enabled.id,
        custom_request_label: "Make it yours",
        custom_request_note: "Navy thread\n\nstrap 2 cm longer",
      },
    ]);
  });

  it("keeps two lines of the same product with different notes as two items", async () => {
    const { res, body } = await placeOrder(
      orderBody([
        { slug: enabled.slug, customRequest: "Navy thread" },
        { slug: enabled.slug, customRequest: "Initials MS" },
      ]),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    const notes = (await storedItems(body.order.id)).map((i) => i.custom_request_note);
    expect(notes.sort()).toEqual(["Initials MS", "Navy thread"]);
  });

  it("stores null label and note for an item without a request (blank counts as none)", async () => {
    const { res, body } = await placeOrder(
      orderBody([{ slug: enabled.slug }, { slug: enabled.slug, customRequest: "  \n " }]),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    expect(await storedItems(body.order.id)).toEqual([
      { product_id: enabled.id, custom_request_label: null, custom_request_note: null },
      { product_id: enabled.id, custom_request_label: null, custom_request_note: null },
    ]);
  });

  it("accepts exactly 300 characters, counted after normalising", async () => {
    const note = "a".repeat(300);
    const { res, body } = await placeOrder(
      orderBody([{ slug: enabled.slug, customRequest: `\n  ${note}  \n` }]),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    expect((await storedItems(body.order.id))[0].custom_request_note).toBe(note);
  });

  it("rejects a note over 300 characters with the brief's message", async () => {
    const { res, body } = await placeOrder(
      orderBody([{ slug: enabled.slug, customRequest: "a".repeat(301) }]),
      scratchOrderIds
    );
    expect(res.status).toBe(400);
    expect(body.error).toBe(
      `Your request for ${enabled.name} is too long (300 characters max).`
    );
  });

  it("rejects a non-string note as an invalid cart item", async () => {
    const { res, body } = await placeOrder(
      orderBody([{ slug: enabled.slug, customRequest: { text: "Navy" } }]),
      scratchOrderIds
    );
    expect(res.status).toBe(400);
    expect(body.error).toBe("One or more cart items are invalid.");
  });

  it("lets the note through when the product's requests are off (decision F)", async () => {
    const { res, body } = await placeOrder(
      orderBody([{ slug: disabled.slug, customRequest: "Navy thread" }]),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    expect(await storedItems(body.order.id)).toEqual([
      {
        product_id: disabled.id,
        custom_request_label: "Special request",
        custom_request_note: "Navy thread",
      },
    ]);
  });
});

describe("create_order() backstop", () => {
  it("rolls the whole order back when a note breaks the 300-character check", async () => {
    const before = await getProductForAdmin(enabled.id);
    const ordersBefore = await countOrders();
    const input: NewOrder = {
      customer: { name: "Vitest", email, phone: "0917 000 0000" },
      shippingAddress: {
        street: "1 Test St",
        address2: "",
        barangay: "Bel-Air",
        city: "City of Makati",
        province: "",
        region: "NCR",
        postalCode: "1209",
        ...MAKATI_BEL_AIR,
      },
      items: [
        {
          productId: enabled.id,
          slug: enabled.slug,
          name: enabled.name,
          options: [],
          quantity: 1,
          priceCentavos: PRICE_CENTAVOS,
          customRequestLabel: "Make it yours",
          customRequestNote: "a".repeat(301),
        },
      ],
      subtotalCentavos: PRICE_CENTAVOS,
      shippingCentavos: 0,
      promoCodeId: null,
      promoCode: null,
      discountCentavos: 0,
      totalCentavos: PRICE_CENTAVOS,
    };

    let error: unknown = null;
    try {
      const order = await createOrder(input);
      // Shouldn't happen, but if it does it must still be cleaned up.
      scratchOrderIds.push(order.id);
    } catch (err) {
      error = err;
    }
    expect(error).toMatchObject({ code: "23514" });

    const after = await getProductForAdmin(enabled.id);
    expect(after?.stockQuantity).toBe(before?.stockQuantity);
    expect(await countOrders()).toBe(ordersBefore);
  });
});
