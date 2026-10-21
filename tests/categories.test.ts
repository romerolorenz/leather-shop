import { afterAll, describe, expect, it } from "vitest";
import {
  listCategories,
  createCategory,
  renameCategory,
  deleteCategory,
} from "@/lib/admin/categories";
import { createProduct, type ProductInput } from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CleanupErrors, deleteRowsById } from "./helpers/cleanup";

// Runs against the real (dev) Supabase project. Uses scratch categories
// (never the shared "Test" category other test files reuse) so deleting
// them here can't collide with another file's scratch product.

const scratchCategoryIds: string[] = [];
const scratchProductIds: string[] = [];

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteRowsById(errors, "products", scratchProductIds);
  await deleteRowsById(errors, "categories", scratchCategoryIds);
  errors.throwIfAny();
});

// The id comes back from the insert itself and is queued for cleanup
// before anything else (a later read) can throw.
async function makeCategory(name: string): Promise<string> {
  const { id } = await createCategory(name);
  scratchCategoryIds.push(id);
  return id;
}

describe("categories", () => {
  it("creates, lists, and renames a category", async () => {
    const name = `Vitest Category ${Date.now()}`;
    const id = await makeCategory(name);

    expect((await listCategories()).map((c) => c.name)).toContain(name);

    const renamed = `${name} Renamed`;
    await renameCategory(id, renamed);
    const categories = await listCategories();
    expect(categories.map((c) => c.name)).toContain(renamed);
    expect(categories.map((c) => c.name)).not.toContain(name);
  });

  it("deletes an unused category", async () => {
    const name = `Vitest Category Unused ${Date.now()}`;
    const id = await makeCategory(name);

    await deleteCategory(id);
    scratchCategoryIds.splice(scratchCategoryIds.indexOf(id), 1);

    expect((await listCategories()).map((c) => c.id)).not.toContain(id);
  });

  it("refuses to delete a category still referenced by a product", async () => {
    const name = `Vitest Category In Use ${Date.now()}`;
    const categoryId = await makeCategory(name);

    const input: ProductInput = {
      name: `Vitest Category Product ${Date.now()}`,
      description: "",
      categoryId,
      priceCentavos: 10000,
      leadTimeDays: 1,
      orderingEnabled: true,
      visible: true,
      stockQuantity: 1,
    };
    const { id: productId } = await createProduct(input);
    scratchProductIds.push(productId);

    await expect(deleteCategory(categoryId)).rejects.toThrow(/still use/);

    // Cleanup order matters: the product must go before the category can.
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw error; // afterAll still has the product's id
    scratchProductIds.splice(scratchProductIds.indexOf(productId), 1);
    await deleteCategory(categoryId);
    scratchCategoryIds.splice(scratchCategoryIds.indexOf(categoryId), 1);
  });
});
