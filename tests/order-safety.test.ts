import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  cancelOrderAndRestoreStock,
  createOrder,
  InsufficientStockError,
  listOrdersForCustomer,
  markOrderPaid,
  markOrderShipped,
  type NewOrder,
} from "@/lib/orders";
import {
  createPromoCode,
  PromoCodeRedemptionError,
  type PromoCodeInput,
} from "@/lib/promo-codes";
import { createProduct } from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { assertPsgcSeeded, MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";
import { placeOrder } from "./helpers/place-order";

// Order safety (migration 0026): order creation and cancellation are each
// one database transaction, so a failure leaves nothing half-done, and
// emails match case-insensitively. Uses its own scratch products and promo
// codes (not the seed products orders.test.ts needs), so it runs on dev.
// Every order is recorded for cleanup before anything is asserted.

const PRICE_CENTAVOS = 100000; // ₱1,000

const scratchProductIds: string[] = [];
const scratchPromoCodeIds: string[] = [];
const scratchOrderIds: string[] = [];
// Unique per run, so leftover rows from an earlier run can't collide with
// the per-customer promo checks or the My Account lookup.
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

beforeAll(async () => {
  // POST /api/orders validates the address against PSGC (migration 0025).
  await assertPsgcSeeded();
});

// Batched, so it's a handful of requests however many orders the file
// made. The longer timeout is a backstop: cut short, cleanup leaves
// scratch rows on dev.
afterAll(async () => {
  const supabase = getSupabaseServerClient();
  const errors = new CleanupErrors();
  // promo_code_redemptions has no ON DELETE, so it goes before its orders.
  if (scratchPromoCodeIds.length) {
    errors.check(
      `delete redemptions of promo codes ${scratchPromoCodeIds.join(", ")}`,
      await supabase
        .from("promo_code_redemptions")
        .delete()
        .in("promo_code_id", scratchPromoCodeIds)
    );
  }
  await deleteOrdersRestoringStock(errors, scratchOrderIds);
  await deleteRowsById(errors, "promo_codes", scratchPromoCodeIds);
  await deleteRowsById(errors, "products", scratchProductIds);
  errors.throwIfAny();
}, 120_000);

type ScratchProduct = { id: string; slug: string; name: string };

async function makeProduct(stockQuantity: number): Promise<ScratchProduct> {
  const name = `Vitest Order Safety ${runId} ${scratchProductIds.length}`;
  const { id } = await createProduct({
    name,
    description: "",
    categoryId: await getOrCreateTestCategoryId(),
    priceCentavos: PRICE_CENTAVOS,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity,
  });
  scratchProductIds.push(id);
  const { data, error } = await getSupabaseServerClient()
    .from("products")
    .select("slug")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(`Couldn't read scratch product: ${error?.message}`);
  return { id, slug: data.slug, name };
}

async function makePromoCode(overrides: Partial<PromoCodeInput> = {}) {
  const input: PromoCodeInput = {
    code: `VITESTSAFE${runId}${scratchPromoCodeIds.length}`,
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
  return { id, code: input.code };
}

async function stockOf(productId: string): Promise<number> {
  const { data, error } = await getSupabaseServerClient()
    .from("products")
    .select("stock_quantity")
    .eq("id", productId)
    .single();
  if (error || !data) throw new Error(`Couldn't read stock: ${error?.message}`);
  return data.stock_quantity;
}

async function redemptionCount(promoCodeId: string): Promise<number> {
  const { count, error } = await getSupabaseServerClient()
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", promoCodeId);
  if (error) throw error;
  return count ?? 0;
}

async function orderIdsForEmail(email: string): Promise<string[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("orders")
    .select("id")
    .eq("customer_email", email.toLowerCase());
  if (error) throw error;
  return data.map((row) => row.id);
}

function email(label: string) {
  return `safety-${label}-${runId}@example.com`;
}

// createOrder input for one line of `product`, as the route would build it.
function newOrder(
  product: ScratchProduct,
  customerEmail: string,
  {
    quantity = 1,
    promo,
  }: { quantity?: number; promo?: { id: string; code: string } } = {}
): NewOrder {
  const subtotal = PRICE_CENTAVOS * quantity;
  const discount = promo ? subtotal / 10 : 0;
  return {
    customer: { name: "Vitest", email: customerEmail, phone: "123" },
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
        productId: product.id,
        slug: product.slug,
        name: product.name,
        options: [],
        quantity,
        priceCentavos: PRICE_CENTAVOS,
      },
    ],
    subtotalCentavos: subtotal,
    shippingCentavos: 0,
    promoCodeId: promo?.id ?? null,
    promoCode: promo?.code ?? null,
    discountCentavos: discount,
    totalCentavos: subtotal - discount,
  };
}

// Calls createOrder, recording any order it makes before returning.
async function create(input: NewOrder) {
  const order = await createOrder(input);
  scratchOrderIds.push(order.id);
  return order;
}

// Runs createOrder expecting it to fail; if it wrongly succeeds, the order
// is still recorded for cleanup. Returns the error.
async function createExpectingFailure(input: NewOrder): Promise<unknown> {
  try {
    const order = await createOrder(input);
    scratchOrderIds.push(order.id);
  } catch (err) {
    return err;
  }
  throw new Error("createOrder should have failed but placed the order");
}

function routeBody(slug: string, customerEmail: string, promoCode?: string, quantity = 1) {
  return {
    customer: { name: "Vitest", email: customerEmail, phone: "123" },
    shippingAddress: { street: "1 Test St", ...MAKATI_BEL_AIR, postalCode: "1209" },
    items: [{ slug, selectedOptions: {}, quantity }],
    promoCode,
  };
}

describe("order creation is all-or-nothing", () => {
  it("a promo that's used up leaves no order, takes no stock and redeems nothing", async () => {
    const product = await makeProduct(5);
    const promo = await makePromoCode({ usageLimitTotal: 1 });
    await create(newOrder(product, email("promo-first"), { promo }));

    const stockBefore = await stockOf(product.id);
    const loser = email("promo-second");
    const err = await createExpectingFailure(newOrder(product, loser, { promo }));

    expect(err).toBeInstanceOf(PromoCodeRedemptionError);
    expect((err as Error).message).toBe(
      "That promo code just became unavailable — remove it and try again."
    );
    expect(await orderIdsForEmail(loser)).toEqual([]);
    expect(await stockOf(product.id)).toBe(stockBefore);
    expect(await redemptionCount(promo.id)).toBe(1);
  });

  it("not enough stock leaves no order and doesn't touch stock", async () => {
    const product = await makeProduct(1);
    const customerEmail = email("short");
    const err = await createExpectingFailure(
      newOrder(product, customerEmail, { quantity: 2 })
    );

    expect(err).toBeInstanceOf(InsufficientStockError);
    expect((err as Error).message).toBe(`${product.name} no longer has enough stock.`);
    expect(await orderIdsForEmail(customerEmail)).toEqual([]);
    expect(await stockOf(product.id)).toBe(1);
  });

  it("not enough stock with a promo redeems nothing", async () => {
    const product = await makeProduct(1);
    const promo = await makePromoCode({ usageLimitTotal: 5 });
    const err = await createExpectingFailure(
      newOrder(product, email("short-promo"), { quantity: 2, promo })
    );

    expect(err).toBeInstanceOf(InsufficientStockError);
    expect(await redemptionCount(promo.id)).toBe(0);
  });

  it("the route shows the shopper the stock message with a 409", async () => {
    // The route only checks "in stock" (stock > 0); asking for more than
    // is left is caught by create_order's locked re-check.
    const product = await makeProduct(1);
    const { res, body } = await placeOrder(
      routeBody(product.slug, email("route-short"), undefined, 2),
      scratchOrderIds
    );

    expect(res.status).toBe(409);
    expect(body.error).toBe(`${product.name} no longer has enough stock.`);
    expect(await stockOf(product.id)).toBe(1);
  });
});

describe("concurrent orders", () => {
  it("two orders racing for the last unit: exactly one wins, stock never goes negative", async () => {
    const product = await makeProduct(1);
    const results = await Promise.all([
      placeOrder(routeBody(product.slug, email("race-a")), scratchOrderIds),
      placeOrder(routeBody(product.slug, email("race-b")), scratchOrderIds),
    ]);
    const statuses = results.map((r) => r.res.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    // The loser is turned away by the route's own "in stock" check (400,
    // if the winner had already committed when it looked the product up)
    // or by create_order's locked re-check (409). Which one depends on
    // timing; the direct race below always reaches the lock.
    const loser = results.find((r) => r.res.status !== 201)!;
    expect([
      { status: 400, error: `${product.name} is unavailable.` },
      { status: 409, error: `${product.name} no longer has enough stock.` },
    ]).toContainEqual({ status: loser.res.status, error: loser.body.error });
    expect(await stockOf(product.id)).toBe(0);
  });

  it("two createOrder calls racing for the last unit: the database lets exactly one through", async () => {
    // Straight to create_order, past the route's checks, so both calls
    // always reach the locked stock re-check.
    const product = await makeProduct(1);
    const results = await Promise.allSettled([
      create(newOrder(product, email("db-race-a"))),
      create(newOrder(product, email("db-race-b"))),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toBeInstanceOf(InsufficientStockError);
    expect(await stockOf(product.id)).toBe(0);
  });

  it("two orders racing past a promo cap of 1: exactly one redeems", async () => {
    const product = await makeProduct(5);
    const promo = await makePromoCode({ usageLimitTotal: 1 });
    const results = await Promise.all([
      placeOrder(routeBody(product.slug, email("cap-a"), promo.code), scratchOrderIds),
      placeOrder(routeBody(product.slug, email("cap-b"), promo.code), scratchOrderIds),
    ]);
    const statuses = results.map((r) => r.res.status);

    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    // The loser is turned away either by the preview check (400, if the
    // winner had already committed) or by create_order's locked re-check
    // (409). Either way it placed nothing.
    const loser = results.find((r) => r.res.status !== 201)!;
    expect([400, 409]).toContain(loser.res.status);
    expect(await redemptionCount(promo.id)).toBe(1);
    // Only the winner's unit is taken.
    expect(await stockOf(product.id)).toBe(4);
  });

  it("two createOrder calls racing past a promo cap of 1: the database redeems exactly once", async () => {
    const product = await makeProduct(5);
    const promo = await makePromoCode({ usageLimitTotal: 1 });
    const results = await Promise.allSettled([
      create(newOrder(product, email("db-cap-a"), { promo })),
      create(newOrder(product, email("db-cap-b"), { promo })),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toBeInstanceOf(PromoCodeRedemptionError);
    expect(await redemptionCount(promo.id)).toBe(1);
    // The loser's stock decrement was rolled back with it.
    expect(await stockOf(product.id)).toBe(4);
  });
});

describe("concurrent orders sharing a promo code", () => {
  // Several orders using one code at once, all within its cap, so every
  // one of them reaches the redemption step while the others are in
  // flight. create_order locks the promo before inserting the order (whose
  // foreign key to the promo would otherwise take a conflicting lock
  // early), so they queue instead of deadlocking. Deterministic when that
  // holds: every order succeeds and each redeems exactly once. A deadlock
  // would fail one of them with a database error.
  it("all succeed with no deadlock, one redemption each", async () => {
    const orders = 5;
    const product = await makeProduct(orders);
    const promo = await makePromoCode({ usageLimitTotal: orders });
    const results = await Promise.allSettled(
      Array.from({ length: orders }, (_, i) =>
        create(newOrder(product, email(`promo-crowd-${i}`), { promo }))
      )
    );

    const failures = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason as { message?: string }).message ?? String(r.reason));
    expect(failures).toEqual([]);
    expect(await redemptionCount(promo.id)).toBe(orders);
    expect(await stockOf(product.id)).toBe(0);
  });
});

describe("cancelOrderAndRestoreStock", () => {
  it("cancelling twice restores stock exactly once", async () => {
    const product = await makeProduct(3);
    const order = await create(newOrder(product, email("cancel-twice"), { quantity: 2 }));
    expect(await stockOf(product.id)).toBe(1);

    expect(await cancelOrderAndRestoreStock(order.id)).toBe(true);
    expect(await cancelOrderAndRestoreStock(order.id)).toBe(false);
    expect(await stockOf(product.id)).toBe(3);
  });

  it("two cancels at the same time restore stock exactly once", async () => {
    const product = await makeProduct(3);
    const order = await create(newOrder(product, email("cancel-race")));

    const results = await Promise.all([
      cancelOrderAndRestoreStock(order.id),
      cancelOrderAndRestoreStock(order.id),
    ]);
    expect(results.sort()).toEqual([false, true]);
    expect(await stockOf(product.id)).toBe(3);
  });

  it("refuses to cancel a paid order and keeps its stock taken", async () => {
    const product = await makeProduct(3);
    const order = await create(newOrder(product, email("cancel-paid")));
    await markOrderPaid(order.id);

    expect(await cancelOrderAndRestoreStock(order.id)).toBe(false);
    expect(await stockOf(product.id)).toBe(2);
  });

  it("refuses to cancel a shipped order and keeps its stock taken", async () => {
    const product = await makeProduct(3);
    const order = await create(newOrder(product, email("cancel-shipped")));
    await markOrderPaid(order.id);
    await markOrderShipped(order.id);

    expect(await cancelOrderAndRestoreStock(order.id)).toBe(false);
    expect(await stockOf(product.id)).toBe(2);
  });
});

describe("cancels and orders on the same products", () => {
  // A cancel of a two-product order racing a new order for the same two
  // products, with the new cart in the opposite id order. Both lock
  // products in id order, so neither deadlocks (Postgres would abort one
  // with a deadlock error). The outcome is deterministic: both succeed and
  // stock adds up. A deadlock is timing-dependent, so several rounds give a
  // regression a real chance to show.
  it("both complete with no deadlock and the right final stock", async () => {
    const [low, high] = [await makeProduct(10), await makeProduct(10)].sort((a, b) =>
      a.id < b.id ? -1 : 1
    );
    const twoItems = (customerEmail: string, products: ScratchProduct[]): NewOrder => {
      const base = newOrder(products[0], customerEmail);
      const items = products.map((p) => ({ ...base.items[0], productId: p.id, slug: p.slug, name: p.name }));
      const subtotal = PRICE_CENTAVOS * items.length;
      return { ...base, items, subtotalCentavos: subtotal, totalCentavos: subtotal };
    };

    const rounds = 4;
    for (let i = 0; i < rounds; i++) {
      const existing = await create(twoItems(email(`lock-old-${i}`), [low, high]));
      const [cancelled] = await Promise.all([
        cancelOrderAndRestoreStock(existing.id),
        create(twoItems(email(`lock-new-${i}`), [high, low])),
      ]);
      expect(cancelled).toBe(true);
    }

    // Each round's cancel gives back what its order took; each new order
    // keeps one of each.
    expect(await stockOf(low.id)).toBe(10 - rounds);
    expect(await stockOf(high.id)).toBe(10 - rounds);
  });
});

describe("emails are case-insensitive", () => {
  it("a one-per-customer promo used as a@x.com is refused for A@X.com", async () => {
    const product = await makeProduct(5);
    const promo = await makePromoCode({ usageLimitTotal: 10 });
    const lower = email("promo-case");

    const first = await placeOrder(routeBody(product.slug, lower, promo.code), scratchOrderIds);
    expect(first.res.status).toBe(201);

    const second = await placeOrder(
      routeBody(product.slug, lower.toUpperCase(), promo.code),
      scratchOrderIds
    );
    expect(second.res.status).toBe(400);
    expect(second.body.error).toBe("You've already used this promo code.");
    expect(await redemptionCount(promo.id)).toBe(1);
  });

  it("the database refuses it too, if the preview check is skipped", async () => {
    const product = await makeProduct(5);
    const promo = await makePromoCode({ usageLimitTotal: 10 });
    const lower = email("promo-case-db");
    await create(newOrder(product, lower, { promo }));

    const err = await createExpectingFailure(
      newOrder(product, `  ${lower.toUpperCase()} `, { promo })
    );
    expect(err).toBeInstanceOf(PromoCodeRedemptionError);
    expect(await redemptionCount(promo.id)).toBe(1);
  });

  it("an order placed as A@X.com is stored lowercased and shows for a@x.com", async () => {
    const product = await makeProduct(5);
    const lower = email("account-case");

    const { res, body } = await placeOrder(
      routeBody(product.slug, lower.toUpperCase()),
      scratchOrderIds
    );
    expect(res.status).toBe(201);
    expect(body.order.customer.email).toBe(lower);

    const orders = await listOrdersForCustomer(lower);
    expect(orders.map((o) => o.id)).toContain(body.order.id);
    expect(orders.find((o) => o.id === body.order.id)?.customer.email).toBe(lower);
    // And the other way round, for a Google account email with capitals.
    expect((await listOrdersForCustomer(lower.toUpperCase())).map((o) => o.id)).toContain(
      body.order.id
    );
  });
});
