import { afterAll, describe, expect, it } from "vitest";
import { GET } from "@/app/api/orders/expire/route";
import { createOrder } from "@/lib/orders";
import { createProduct } from "@/lib/admin/catalog";
import { getSettings } from "@/lib/settings";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";
import { MAKATI_BEL_AIR } from "./helpers/psgc-fixtures";
import {
  CleanupErrors,
  deleteOrdersRestoringStock,
  deleteRowsById,
} from "./helpers/cleanup";

function makeRequest(headers?: Record<string, string>) {
  return new Request("http://localhost/api/orders/expire", { headers });
}

describe("GET /api/orders/expire", () => {
  it("rejects requests without a valid CRON_SECRET", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects requests with an incorrect CRON_SECRET", async () => {
    const res = await GET(makeRequest({ authorization: "Bearer wrong-secret" }));
    expect(res.status).toBe(401);
  });

  it("accepts requests with the correct CRON_SECRET", async () => {
    const res = await GET(
      makeRequest({ authorization: `Bearer ${process.env.CRON_SECRET}` })
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty("checked");
    expect(body).toHaveProperty("cancelled");
    expect(body).toHaveProperty("failed");
  });
});

// The real sweep against dev: an order placed longer ago than the payment
// hold gets cancelled and its stock goes back. Lives in the data lane (see
// vitest.config.ts), so no other order test runs at the same time. Like
// the case above, it also expires any other overdue dev orders, which is
// what the daily cron would do anyway.
describe("GET /api/orders/expire cancels an expired order", () => {
  const scratchProductIds: string[] = [];
  const scratchOrderIds: string[] = [];

  afterAll(async () => {
    const errors = new CleanupErrors();
    await deleteOrdersRestoringStock(errors, scratchOrderIds);
    await deleteRowsById(errors, "products", scratchProductIds);
    errors.throwIfAny();
  });

  it("cancels it, restores its stock, and reports no failures", async () => {
    const supabase = getSupabaseServerClient();
    const name = `Vitest Expiry Product ${Date.now()}`;
    const { id: productId } = await createProduct({
      name,
      description: "",
      categoryId: await getOrCreateTestCategoryId(),
      priceCentavos: 100000,
      leadTimeDays: 1,
      orderingEnabled: true,
      visible: true,
      stockQuantity: 3,
    });
    scratchProductIds.push(productId);

    const order = await createOrder({
      customer: { name: "Vitest", email: `expiry-${Date.now()}@example.com`, phone: "123" },
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
          productId,
          slug: "",
          name,
          options: [],
          quantity: 2,
          priceCentavos: 100000,
        },
      ],
      subtotalCentavos: 200000,
      shippingCentavos: 0,
      promoCodeId: null,
      promoCode: null,
      discountCentavos: 0,
      totalCentavos: 200000,
    });
    scratchOrderIds.push(order.id);

    // Backdate it past the hold (an admin setting, read rather than assumed).
    const { orderPaymentHoldHours } = await getSettings();
    const placedAt = new Date(Date.now() - (orderPaymentHoldHours + 1) * 3600 * 1000);
    const { error: backdateError } = await supabase
      .from("orders")
      .update({ created_at: placedAt.toISOString() })
      .eq("id", order.id);
    expect(backdateError).toBeNull();

    const res = await GET(
      makeRequest({ authorization: `Bearer ${process.env.CRON_SECRET}` })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.failed).toEqual([]);
    expect(body.cancelled).toBeGreaterThanOrEqual(1);

    const { data: row } = await supabase
      .from("orders")
      .select("status")
      .eq("id", order.id)
      .single();
    expect(row?.status).toBe("cancelled");

    const { data: product } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    expect(product?.stock_quantity).toBe(3);
  });
});
