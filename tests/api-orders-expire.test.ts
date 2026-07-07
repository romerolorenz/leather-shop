import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/orders/expire/route";

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
  });
});
