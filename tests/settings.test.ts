import { describe, expect, it } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";

describe("settings", () => {
  it("round-trips an update and restores the original value", async () => {
    const original = await getSettings();

    await updateSettings({ orderPaymentHoldHours: 24 });
    expect((await getSettings()).orderPaymentHoldHours).toBe(24);

    await updateSettings({
      orderPaymentHoldHours: original.orderPaymentHoldHours,
    });
    expect((await getSettings()).orderPaymentHoldHours).toBe(
      original.orderPaymentHoldHours
    );
  });
});
