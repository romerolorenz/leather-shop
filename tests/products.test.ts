import { afterAll, describe, expect, it } from "vitest";
import {
  createProduct,
  updateProduct,
  slugify,
  type ProductInput,
} from "@/lib/admin/catalog";
import { getProducts, getProductBySlug } from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project. Uses a scratch product
// (not the seeded wallet/tote) so mutations here never touch real catalog
// data.

const baseInput: ProductInput = {
  name: "Vitest Products Lib Scratch Product",
  description: "",
  category: "Test",
  priceCentavos: 10000,
  leadTimeDays: 1,
  orderingEnabled: true,
  visible: true,
  stockQuantity: 5,
};
const slug = slugify(baseInput.name);

const scratchProductIds: string[] = [];

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
});

describe("product visibility", () => {
  it("getProducts() excludes a hidden product; getProductBySlug() still resolves it", async () => {
    const { id } = await createProduct(baseInput);
    scratchProductIds.push(id);

    expect((await getProducts()).map((p) => p.id)).toContain(id);
    expect((await getProductBySlug(slug))?.visible).toBe(true);

    await updateProduct(id, { ...baseInput, visible: false });

    expect((await getProducts()).map((p) => p.id)).not.toContain(id);
    const hidden = await getProductBySlug(slug);
    expect(hidden?.id).toBe(id);
    expect(hidden?.visible).toBe(false);

    await updateProduct(id, baseInput);
    expect((await getProducts()).map((p) => p.id)).toContain(id);
  });
});
