import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createProduct,
  createOptionType,
  updateOptionType,
  deleteOptionType,
  createOptionValue,
  updateOptionValue,
  deleteOptionValue,
  createVariant,
  updateVariantStock,
  deleteVariant,
  getProductForAdmin,
  DuplicateVariantError,
} from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project. Uses a scratch product
// (not the seeded wallet/tote) so mutations here never touch real catalog
// data — deleting the product cascades to its option types/values/variants.

let productId: string;

beforeAll(async () => {
  const { id } = await createProduct({
    name: "Vitest Scratch Product",
    description: "",
    category: "Test",
    priceCentavos: 10000,
    leadTimeDays: 1,
    orderingEnabled: true,
  });
  productId = id;
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  await supabase.from("products").delete().eq("id", productId);
});

describe("option types and values", () => {
  it("creates, renames, and composes a variant label from them", async () => {
    const { id: colorTypeId } = await createOptionType(productId, "Color");
    const { id: threadTypeId } = await createOptionType(
      productId,
      "Thread Color"
    );

    const { id: blackValueId } = await createOptionValue(
      colorTypeId,
      "Black"
    );
    const { id: naturalValueId } = await createOptionValue(
      threadTypeId,
      "Natural"
    );

    const { id: variantId } = await createVariant(
      productId,
      [blackValueId, naturalValueId],
      5
    );

    const product = await getProductForAdmin(productId);
    expect(product!.optionTypes).toHaveLength(2);
    expect(product!.optionTypes.map((t) => t.name)).toEqual([
      "Color",
      "Thread Color",
    ]);

    const variant = product!.variants.find((v) => v.id === variantId)!;
    expect(variant.label).toBe("Black / Natural");
    expect(variant.stockQuantity).toBe(5);
    expect(new Set(variant.optionValueIds)).toEqual(
      new Set([blackValueId, naturalValueId])
    );

    await updateOptionType(colorTypeId, "Leather Color");
    await updateOptionValue(blackValueId, "Jet Black");

    const renamed = await getProductForAdmin(productId);
    const renamedVariant = renamed!.variants.find((v) => v.id === variantId)!;
    expect(renamed!.optionTypes.map((t) => t.name)).toContain(
      "Leather Color"
    );
    expect(renamedVariant.label).toBe("Jet Black / Natural");
  });

  it("rejects creating a variant with a duplicate combination", async () => {
    const { id: sizeTypeId } = await createOptionType(productId, "Size");
    const { id: smallValueId } = await createOptionValue(sizeTypeId, "Small");

    await createVariant(productId, [smallValueId], 1);

    await expect(
      createVariant(productId, [smallValueId], 3)
    ).rejects.toThrow(DuplicateVariantError);
  });

  it("updateVariantStock only changes stock, not the combination", async () => {
    const { id: sizeTypeId } = await createOptionType(productId, "Length");
    const { id: shortValueId } = await createOptionValue(sizeTypeId, "Short");
    const { id: variantId } = await createVariant(
      productId,
      [shortValueId],
      2
    );

    await updateVariantStock(variantId, 9);

    const product = await getProductForAdmin(productId);
    const variant = product!.variants.find((v) => v.id === variantId)!;
    expect(variant.stockQuantity).toBe(9);
    expect(variant.label).toBe("Short");
  });

  it("deleteVariant and deleteOptionValue/Type remove their rows", async () => {
    const { id: typeId } = await createOptionType(productId, "Finish");
    const { id: valueId } = await createOptionValue(typeId, "Matte");
    const { id: variantId } = await createVariant(productId, [valueId], 1);

    await deleteVariant(variantId);
    let product = await getProductForAdmin(productId);
    expect(product!.variants.find((v) => v.id === variantId)).toBeUndefined();

    await deleteOptionValue(valueId);
    product = await getProductForAdmin(productId);
    const type = product!.optionTypes.find((t) => t.id === typeId)!;
    expect(type.values.find((v) => v.id === valueId)).toBeUndefined();

    await deleteOptionType(typeId);
    product = await getProductForAdmin(productId);
    expect(product!.optionTypes.find((t) => t.id === typeId)).toBeUndefined();
  });
});
