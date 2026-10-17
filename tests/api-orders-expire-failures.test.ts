import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The expiry sweep's failure handling: one order failing to cancel doesn't
// stop the others, and the run returns a 500 (so Vercel's cron logs flag
// it) with the failure listed. The database is mocked out here, since a
// real cancel can't be made to fail on demand; the real sweep against dev
// is covered in api-orders-expire.test.ts.

vi.mock("@/lib/settings", () => ({
  getSettings: vi.fn(async () => ({ orderPaymentHoldHours: 48 })),
}));

const cancelOrderAndRestoreStock = vi.fn();
vi.mock("@/lib/orders", () => ({
  getExpiredPendingOrderIds: vi.fn(async () => ["order-a", "order-b", "order-c"]),
  cancelOrderAndRestoreStock: (id: string) => cancelOrderAndRestoreStock(id),
}));

const { GET } = await import("@/app/api/orders/expire/route");

const originalSecret = process.env.CRON_SECRET;
process.env.CRON_SECRET = originalSecret || "test-secret";
afterAll(() => {
  // Assigning undefined would store the string "undefined".
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

function cronRequest() {
  return new Request("http://localhost/api/orders/expire", {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
}

beforeEach(() => {
  cancelOrderAndRestoreStock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /api/orders/expire when an order fails to cancel", () => {
  it("carries on with the rest, lists the failure, and returns a 500", async () => {
    cancelOrderAndRestoreStock.mockImplementation(async (id: string) => {
      // A Supabase error is a plain object with a message, not an Error.
      if (id === "order-b") throw { message: "connection timed out" };
      return true;
    });

    const res = await GET(cronRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      checked: 3,
      cancelled: 2,
      failed: [{ orderId: "order-b", error: "connection timed out" }],
    });
    expect(cancelOrderAndRestoreStock).toHaveBeenCalledTimes(3);
  });

  it("returns a 200 with an empty failed list when every cancel works", async () => {
    cancelOrderAndRestoreStock.mockResolvedValue(true);

    const res = await GET(cronRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ checked: 3, cancelled: 3, failed: [] });
  });
});
