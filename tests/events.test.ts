import { afterEach, describe, expect, it, vi } from "vitest";
import { logEvent } from "@/lib/events";

describe("logEvent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a single structured JSON line with the event name, data, and a timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logEvent("add_to_cart", { slug: "classic-bifold-wallet", quantity: 2 });

    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged).toMatchObject({
      event: "add_to_cart",
      slug: "classic-bifold-wallet",
      quantity: 2,
    });
    expect(typeof logged.timestamp).toBe("string");
    expect(new Date(logged.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("defaults to no extra data", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    logEvent("checkout_started");

    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.event).toBe("checkout_started");
  });
});
