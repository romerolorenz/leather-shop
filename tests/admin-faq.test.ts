import { afterEach, describe, expect, it } from "vitest";
import {
  createFaqItem,
  updateFaqItem,
  deleteFaqItem,
  reorderFaqItems,
  listFaqItemsForAdmin,
} from "@/lib/admin/faq";

// Runs against the real (dev) Supabase project — every item created here is
// deleted in afterEach so the shop's real FAQ list is untouched.

const scratchIds: string[] = [];

async function createScratchItem(question: string): Promise<string> {
  await createFaqItem(question, "Vitest answer");
  const items = await listFaqItemsForAdmin();
  const item = [...items].reverse().find((i) => i.question === question)!;
  scratchIds.push(item.id);
  return item.id;
}

afterEach(async () => {
  while (scratchIds.length > 0) {
    await deleteFaqItem(scratchIds.pop()!);
  }
});

describe("createFaqItem / updateFaqItem / deleteFaqItem", () => {
  it("creates, updates, then deletes an item", async () => {
    const id = await createScratchItem("Vitest FAQ question");
    let items = await listFaqItemsForAdmin();
    expect(items.find((i) => i.id === id)?.question).toBe(
      "Vitest FAQ question"
    );

    await updateFaqItem(id, "Vitest FAQ question (updated)", "New answer");
    items = await listFaqItemsForAdmin();
    const updated = items.find((i) => i.id === id);
    expect(updated?.question).toBe("Vitest FAQ question (updated)");
    expect(updated?.answer).toBe("New answer");

    await deleteFaqItem(id);
    scratchIds.pop();
    items = await listFaqItemsForAdmin();
    expect(items.find((i) => i.id === id)).toBeUndefined();
  });
});

describe("reorderFaqItems", () => {
  it("persists three scratch items in the given order relative to each other", async () => {
    const a = await createScratchItem("Vitest Reorder A");
    const b = await createScratchItem("Vitest Reorder B");
    const c = await createScratchItem("Vitest Reorder C");

    // Reorder within the full list (scratch items land wherever the
    // existing real items' positions end) — assert only the relative
    // order of a/b/c survives, not their absolute indices.
    const before = await listFaqItemsForAdmin();
    const fullOrderIds = before.map((i) => i.id);
    const reordered = [
      ...fullOrderIds.filter((id) => id !== a && id !== b && id !== c),
      c,
      a,
      b,
    ];
    await reorderFaqItems(reordered);

    const after = await listFaqItemsForAdmin();
    const relative = after
      .map((i) => i.id)
      .filter((id) => id === a || id === b || id === c);
    expect(relative).toEqual([c, a, b]);
  });
});
