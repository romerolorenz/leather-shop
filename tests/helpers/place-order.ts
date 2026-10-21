import { POST } from "@/app/api/orders/route";

/**
 * POSTs an order through the real route. Any order it creates is pushed
 * onto `createdOrderIds` before the caller asserts anything, so a "should
 * reject" case that wrongly succeeds still gets its order (and stock)
 * cleaned up.
 */
export async function placeOrder(body: unknown, createdOrderIds: string[]) {
  const res = await POST(
    new Request("http://localhost/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
  const json = await res.json();
  if (json.order?.id) createdOrderIds.push(json.order.id);
  return { res, body: json };
}
