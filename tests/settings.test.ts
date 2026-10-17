import { describe, expect, it } from "vitest";
import { getSettings, updateSettings } from "@/lib/settings";
import { restoreSettings, snapshotSettings } from "./helpers/settings-snapshot";

describe("settings", () => {
  it("round-trips an update", async () => {
    // Snapshot and restore the raw row, not via updateSettings(): a bug in
    // the code under test mustn't be able to leave the changed value on dev.
    const rows = await snapshotSettings(["order_payment_hold_hours"]);
    const original = await getSettings();
    // Any value other than the current one, so the change is observable.
    const changed = original.orderPaymentHoldHours === 24 ? 25 : 24;
    try {
      await updateSettings({ orderPaymentHoldHours: changed });
      expect((await getSettings()).orderPaymentHoldHours).toBe(changed);
    } finally {
      await restoreSettings(rows);
    }
    expect(await snapshotSettings(["order_payment_hold_hours"])).toEqual(rows);
  });
});
