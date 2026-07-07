import { afterAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/orders/route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const createdOrderIds: string[] = [];

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const orderId of createdOrderIds) {
    const { data: items } = await supabase
      .from("order_items")
      .select("variant_id, quantity")
      .eq("order_id", orderId);
    for (const item of items ?? []) {
      await supabase.rpc("restore_variant_stock", {
        p_variant_id: item.variant_id,
        p_quantity: item.quantity,
      });
    }
    await supabase.from("orders").delete().eq("id", orderId);
  }
});

describe("POST /api/orders", () => {
  it("rejects a non-Metro-Manila city", async () => {
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Cebu City" },
        items: [
          { slug: "classic-bifold-wallet", variant: "Chestnut Brown", quantity: 1 },
        ],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects an empty cart", async () => {
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Pasig" },
        items: [],
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects a sold-out variant", async () => {
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "t@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Pasig" },
        items: [{ slug: "tote-bag", variant: "Black", quantity: 1 }],
      })
    );
    expect(res.status).toBe(400);
  });

  it("creates a valid order and prices it server-side", async () => {
    const res = await POST(
      makeRequest({
        customer: { name: "Test", email: "vitest-api@example.com", phone: "123" },
        shippingAddress: { street: "1 St", city: "Pasig" },
        items: [
          { slug: "classic-bifold-wallet", variant: "Chestnut Brown", quantity: 1 },
        ],
      })
    );
    expect(res.status).toBe(201);

    const body = await res.json();
    createdOrderIds.push(body.order.id);
    expect(body.order.totalCentavos).toBeGreaterThan(0);
    expect(body.order.status).toBe("pending_payment");
  });
});
