import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createProduct,
  setProductFeatured,
  reorderFeaturedProducts,
  listFeaturedProducts,
  type ProductInput,
  type FeaturedProduct,
} from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";

// Runs against the real (dev) Supabase project. "featured" is a global
// max-3 toggle across the whole catalog, not scoped per test — so this
// file temporarily clears whatever is featured today, runs its scenarios
// against scratch products only, then restores the original featured set
// and order exactly in afterAll. Never touches real catalog data beyond
// its featured flag/position, which is fully restored.

const baseInput: ProductInput = {
  name: "Vitest Homepage Scratch Product",
  description: "",
  categoryId: "",
  priceCentavos: 10000,
  leadTimeDays: 1,
  orderingEnabled: true,
  visible: true,
  stockQuantity: 5,
};

const scratchProductIds: string[] = [];
let originalFeatured: FeaturedProduct[] = [];

beforeAll(async () => {
  baseInput.categoryId = await getOrCreateTestCategoryId();
  originalFeatured = await listFeaturedProducts();
  for (const product of originalFeatured) {
    await setProductFeatured(product.id, false);
  }
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
  for (const product of [...originalFeatured].sort(
    (a, b) => a.featuredPosition - b.featuredPosition
  )) {
    await setProductFeatured(product.id, true);
  }
});

async function createScratchProduct(name: string): Promise<string> {
  const { id } = await createProduct({ ...baseInput, name });
  scratchProductIds.push(id);
  return id;
}

describe("setProductFeatured", () => {
  it("enforces a max of 3 featured products until one is unfeatured", async () => {
    const a = await createScratchProduct("Vitest Featured A");
    const b = await createScratchProduct("Vitest Featured B");
    const c = await createScratchProduct("Vitest Featured C");
    const d = await createScratchProduct("Vitest Featured D");

    await setProductFeatured(a, true);
    await setProductFeatured(b, true);
    await setProductFeatured(c, true);

    await expect(setProductFeatured(d, true)).rejects.toThrow(
      "Only 3 products can be featured at once. Unfeature one first."
    );

    await setProductFeatured(b, false);
    await expect(setProductFeatured(d, true)).resolves.not.toThrow();

    // Cleanup so later tests in this file start from zero featured again.
    await setProductFeatured(a, false);
    await setProductFeatured(c, false);
    await setProductFeatured(d, false);
  });

  it("compacts positions with no gap when unfeaturing a middle product", async () => {
    const a = await createScratchProduct("Vitest Compact A");
    const b = await createScratchProduct("Vitest Compact B");
    const c = await createScratchProduct("Vitest Compact C");

    await setProductFeatured(a, true);
    await setProductFeatured(b, true);
    await setProductFeatured(c, true);

    await setProductFeatured(b, false);

    const featured = await listFeaturedProducts();
    expect(featured.map((p) => p.id)).toEqual([a, c]);
    expect(featured.map((p) => p.featuredPosition)).toEqual([0, 1]);

    await setProductFeatured(a, false);
    await setProductFeatured(c, false);
  });
});

describe("reorderFeaturedProducts", () => {
  it("persists the featured set in the given order", async () => {
    const a = await createScratchProduct("Vitest Reorder A");
    const b = await createScratchProduct("Vitest Reorder B");
    const c = await createScratchProduct("Vitest Reorder C");

    await setProductFeatured(a, true);
    await setProductFeatured(b, true);
    await setProductFeatured(c, true);

    let featured = await listFeaturedProducts();
    expect(featured.map((p) => p.id)).toEqual([a, b, c]);

    // A drag can move an item several positions in one drop, not just
    // swap with a neighbor — move c (last) to first.
    await reorderFeaturedProducts([c, a, b]);
    featured = await listFeaturedProducts();
    expect(featured.map((p) => p.id)).toEqual([c, a, b]);

    await setProductFeatured(a, false);
    await setProductFeatured(b, false);
    await setProductFeatured(c, false);
  });
});
