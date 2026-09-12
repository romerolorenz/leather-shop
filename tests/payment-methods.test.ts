import { afterAll, describe, expect, it } from "vitest";
import {
  listPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  reorderPaymentMethods,
} from "@/lib/admin/payment-methods";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project — scratch rows tracked here
// and deleted in afterAll, same shape as tests/categories.test.ts. One
// flat list — no bank-vs-e-wallet distinction (course correction from the
// original type-per-row design).

const scratchPaymentMethodIds: string[] = [];

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of scratchPaymentMethodIds) {
    await supabase.from("payment_methods").delete().eq("id", id);
  }
});

describe("payment methods", () => {
  it("creates, lists, updates, and deletes an entry", async () => {
    const label = `Vitest Bank ${Date.now()}`;
    const { id } = await createPaymentMethod({
      label,
      accountName: "Juan Dela Cruz",
      accountNumber: "1234567890",
    });
    scratchPaymentMethodIds.push(id);

    const afterCreate = await listPaymentMethods();
    const created = afterCreate.find((m) => m.id === id);
    expect(created).toBeDefined();
    expect(created?.label).toBe(label);
    expect(created?.accountName).toBe("Juan Dela Cruz");
    expect(created?.accountNumber).toBe("1234567890");
    expect(created?.qrImageUrl).toBeNull();

    const renamed = `${label} Renamed`;
    await updatePaymentMethod(id, {
      label: renamed,
      accountName: "Juan D. Cruz",
      accountNumber: "0987654321",
    });
    const afterUpdate = await listPaymentMethods();
    const updated = afterUpdate.find((m) => m.id === id);
    expect(updated?.label).toBe(renamed);
    expect(updated?.accountName).toBe("Juan D. Cruz");
    expect(updated?.accountNumber).toBe("0987654321");

    await deletePaymentMethod(id);
    scratchPaymentMethodIds.splice(scratchPaymentMethodIds.indexOf(id), 1);
    expect((await listPaymentMethods()).map((m) => m.id)).not.toContain(id);
  });

  it("reorders entries via setPositions", async () => {
    const { id: firstId } = await createPaymentMethod({
      label: `Vitest Reorder A ${Date.now()}`,
      accountName: "A",
      accountNumber: "1",
    });
    scratchPaymentMethodIds.push(firstId);
    const { id: secondId } = await createPaymentMethod({
      label: `Vitest Reorder B ${Date.now()}`,
      accountName: "B",
      accountNumber: "2",
    });
    scratchPaymentMethodIds.push(secondId);

    const beforeReorder = await listPaymentMethods();
    const firstIndex = beforeReorder.findIndex((m) => m.id === firstId);
    const secondIndex = beforeReorder.findIndex((m) => m.id === secondId);
    expect(firstIndex).toBeLessThan(secondIndex);

    // Reorder the whole list with these two swapped to the front.
    const reorderedIds = [
      secondId,
      firstId,
      ...beforeReorder
        .filter((m) => m.id !== firstId && m.id !== secondId)
        .map((m) => m.id),
    ];
    await reorderPaymentMethods(reorderedIds);

    const afterReorder = await listPaymentMethods();
    const newFirstIndex = afterReorder.findIndex((m) => m.id === firstId);
    const newSecondIndex = afterReorder.findIndex((m) => m.id === secondId);
    expect(newSecondIndex).toBeLessThan(newFirstIndex);

    await deletePaymentMethod(firstId);
    scratchPaymentMethodIds.splice(scratchPaymentMethodIds.indexOf(firstId), 1);
    await deletePaymentMethod(secondId);
    scratchPaymentMethodIds.splice(scratchPaymentMethodIds.indexOf(secondId), 1);
  });
});
