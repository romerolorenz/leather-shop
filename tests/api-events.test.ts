import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/events/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/events", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs an allow-listed event and returns ok", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await POST(
      makeRequest({ event: "add_to_cart", data: { slug: "tote-bag" } })
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({ event: "add_to_cart", slug: "tote-bag" });
  });

  it("rejects an event not on the allow-list", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await POST(makeRequest({ event: "order_placed", data: {} }));

    expect(res.status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects a missing/malformed body", async () => {
    const res = await POST(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      })
    );
    expect(res.status).toBe(400);
  });
});
