import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createProduct,
  updateProduct,
  createOptionType,
  updateOptionType,
  deleteOptionType,
  createOptionValue,
  updateOptionValue,
  deleteOptionValue,
  createVariant,
  deleteVariant,
  getProductForAdmin,
  DuplicateVariantError,
  type ProductInput,
} from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Runs against the real (dev) Supabase project. Uses a scratch product
// (not the seeded wallet/tote) so mutations here never touch real catalog
// data — deleting the product cascades to its option types/values/variants.

const baseInput: ProductInput = {
  name: "Vitest Scratch Product",
  description: "",
  category: "Test",
  priceCentavos: 10000,
  leadTimeDays: 1,
  orderingEnabled: true,
  stockQuantity: 5,
};

let productId: string;

beforeAll(async () => {
  const { id } = await createProduct(baseInput);
  productId = id;
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  await supabase.from("products").delete().eq("id", productId);
});

describe("option types and values", () => {
  it("creates, renames, and composes a variant label from them", async () => {
    const { id: colorTypeId } = await createOptionType(
      productId,
      "Color",
      "buttons"
    );
    const { id: threadTypeId } = await createOptionType(
      productId,
      "Thread Color",
      "dropdown"
    );

    const { id: blackValueId } = await createOptionValue(
      colorTypeId,
      "Black"
    );
    const { id: naturalValueId } = await createOptionValue(
      threadTypeId,
      "Natural"
    );

    const { id: variantId } = await createVariant(productId, [
      blackValueId,
      naturalValueId,
    ]);

    const product = await getProductForAdmin(productId);
    expect(product!.optionTypes).toHaveLength(2);
    expect(product!.optionTypes.map((t) => t.name)).toEqual([
      "Color",
      "Thread Color",
    ]);
    expect(product!.optionTypes.map((t) => t.displayStyle)).toEqual([
      "buttons",
      "dropdown",
    ]);

    const variant = product!.variants.find((v) => v.id === variantId)!;
    expect(variant.label).toBe("Black / Natural");
    expect(new Set(variant.optionValueIds)).toEqual(
      new Set([blackValueId, naturalValueId])
    );

    await updateOptionType(colorTypeId, "Leather Color", "dropdown");
    await updateOptionValue(blackValueId, "Jet Black");

    const renamed = await getProductForAdmin(productId);
    const renamedType = renamed!.optionTypes.find(
      (t) => t.id === colorTypeId
    )!;
    expect(renamedType.name).toBe("Leather Color");
    expect(renamedType.displayStyle).toBe("dropdown");
    const renamedVariant = renamed!.variants.find((v) => v.id === variantId)!;
    expect(renamedVariant.label).toBe("Jet Black / Natural");
  });

  it("rejects creating a variant with a duplicate combination", async () => {
    const { id: sizeTypeId } = await createOptionType(
      productId,
      "Size",
      "buttons"
    );
    const { id: smallValueId } = await createOptionValue(sizeTypeId, "Small");

    await createVariant(productId, [smallValueId]);

    await expect(createVariant(productId, [smallValueId])).rejects.toThrow(
      DuplicateVariantError
    );
  });

  it("stock is a single per-product capacity number, set via updateProduct", async () => {
    await updateProduct(productId, { ...baseInput, stockQuantity: 9 });

    const product = await getProductForAdmin(productId);
    expect(product!.stockQuantity).toBe(9);

    await updateProduct(productId, baseInput);
  });

  it("deleteVariant and deleteOptionValue/Type remove their rows", async () => {
    const { id: typeId } = await createOptionType(
      productId,
      "Finish",
      "buttons"
    );
    const { id: valueId } = await createOptionValue(typeId, "Matte");
    const { id: variantId } = await createVariant(productId, [valueId]);

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
