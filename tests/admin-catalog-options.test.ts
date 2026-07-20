import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createProduct,
  updateProduct,
  listOptionTypes,
  createOptionType,
  updateOptionType,
  deleteOptionType,
  createOptionValue,
  updateOptionValue,
  attachOptionToProduct,
  updateProductOptionSelection,
  detachOptionFromProduct,
  reorderProductOptions,
  getProductForAdmin,
  type ProductInput,
} from "@/lib/admin/catalog";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getOrCreateTestCategoryId } from "./helpers/test-category";

// Runs against the real (dev) Supabase project. Uses scratch products (not
// the seeded wallet/tote) so mutations here never touch real catalog data.
// Option types/values are shop-wide now, not cascaded by a product delete —
// every type created here is cleaned up explicitly in afterAll (cascades
// its own values/attachments).

const baseInput: ProductInput = {
  name: "Vitest Scratch Product",
  description: "",
  categoryId: "",
  priceCentavos: 10000,
  leadTimeDays: 1,
  orderingEnabled: true,
  visible: true,
  stockQuantity: 5,
};

let productId: string;
const scratchProductIds: string[] = [];
const scratchOptionTypeIds: string[] = [];

beforeAll(async () => {
  baseInput.categoryId = await getOrCreateTestCategoryId();
  const { id } = await createProduct(baseInput);
  productId = id;
  scratchProductIds.push(id);
});

afterAll(async () => {
  const supabase = getSupabaseServerClient();
  for (const id of scratchProductIds) {
    await supabase.from("products").delete().eq("id", id);
  }
  for (const id of scratchOptionTypeIds) {
    await supabase.from("option_types").delete().eq("id", id);
  }
});

describe("shop-wide option library", () => {
  it("creates option types/values and renaming applies everywhere", async () => {
    const { id: colorTypeId } = await createOptionType(
      "Vitest Color",
      "buttons"
    );
    scratchOptionTypeIds.push(colorTypeId);
    const { id: blackValueId } = await createOptionValue(colorTypeId, "Black");

    const types = await listOptionTypes();
    const colorType = types.find((t) => t.id === colorTypeId)!;
    expect(colorType.name).toBe("Vitest Color");
    expect(colorType.displayStyle).toBe("buttons");
    expect(colorType.values.map((v) => v.value)).toEqual(["Black"]);

    await updateOptionType(colorTypeId, "Vitest Leather Color", "dropdown");
    await updateOptionValue(blackValueId, "Jet Black");

    const renamed = await listOptionTypes();
    const renamedType = renamed.find((t) => t.id === colorTypeId)!;
    expect(renamedType.name).toBe("Vitest Leather Color");
    expect(renamedType.displayStyle).toBe("dropdown");
    expect(renamedType.values.map((v) => v.value)).toEqual(["Jet Black"]);
  });
});

describe("attaching a shared option to a product", () => {
  it("attaches, sets a value subset, updates it, then detaches", async () => {
    const { id: sizeTypeId } = await createOptionType("Vitest Size", "buttons");
    scratchOptionTypeIds.push(sizeTypeId);
    const { id: smallId } = await createOptionValue(sizeTypeId, "Small");
    const { id: mediumId } = await createOptionValue(sizeTypeId, "Medium");
    const { id: largeId } = await createOptionValue(sizeTypeId, "Large");

    const { productOptionId } = await attachOptionToProduct(
      productId,
      sizeTypeId,
      [smallId, mediumId]
    );

    let product = await getProductForAdmin(productId);
    let option = product!.options.find(
      (o) => o.productOptionId === productOptionId
    )!;
    expect(option.name).toBe("Vitest Size");
    expect(option.allValues.map((v) => v.value)).toEqual([
      "Small",
      "Medium",
      "Large",
    ]);
    expect(new Set(option.selectedValueIds)).toEqual(
      new Set([smallId, mediumId])
    );

    await updateProductOptionSelection(productOptionId, [largeId]);
    product = await getProductForAdmin(productId);
    option = product!.options.find(
      (o) => o.productOptionId === productOptionId
    )!;
    expect(option.selectedValueIds).toEqual([largeId]);

    await detachOptionFromProduct(productOptionId);
    product = await getProductForAdmin(productId);
    expect(
      product!.options.find((o) => o.productOptionId === productOptionId)
    ).toBeUndefined();
  });

  it("attaching the same type to two products keeps their value subsets independent", async () => {
    const { id: secondProductId } = await createProduct({
      ...baseInput,
      name: "Vitest Scratch Product 2",
    });
    scratchProductIds.push(secondProductId);

    const { id: threadTypeId } = await createOptionType(
      "Vitest Thread",
      "dropdown"
    );
    scratchOptionTypeIds.push(threadTypeId);
    const { id: naturalId } = await createOptionValue(threadTypeId, "Natural");
    const { id: darkId } = await createOptionValue(threadTypeId, "Dark");

    await attachOptionToProduct(productId, threadTypeId, [naturalId]);
    await attachOptionToProduct(secondProductId, threadTypeId, [
      naturalId,
      darkId,
    ]);

    const first = await getProductForAdmin(productId);
    const second = await getProductForAdmin(secondProductId);
    const firstOption = first!.options.find(
      (o) => o.optionTypeId === threadTypeId
    )!;
    const secondOption = second!.options.find(
      (o) => o.optionTypeId === threadTypeId
    )!;

    expect(firstOption.selectedValueIds).toEqual([naturalId]);
    expect(new Set(secondOption.selectedValueIds)).toEqual(
      new Set([naturalId, darkId])
    );
  });
});

describe("reorderProductOptions", () => {
  it("persists a product's attached options in the given order", async () => {
    // Isolated scratch product (not the shared `productId`, which by this
    // point in the file may already have other options attached from
    // earlier tests) — this test needs full control over exactly which
    // options are attached and in what order.
    const { id: reorderProductId } = await createProduct({
      ...baseInput,
      name: "Vitest Scratch Product 3",
    });
    scratchProductIds.push(reorderProductId);

    const { id: styleTypeId } = await createOptionType(
      "Vitest Style",
      "buttons"
    );
    scratchOptionTypeIds.push(styleTypeId);
    const { id: eraTypeId } = await createOptionType("Vitest Era", "buttons");
    scratchOptionTypeIds.push(eraTypeId);
    const { id: finishTypeId } = await createOptionType(
      "Vitest Finish 2",
      "buttons"
    );
    scratchOptionTypeIds.push(finishTypeId);

    const { productOptionId: styleOptionId } = await attachOptionToProduct(
      reorderProductId,
      styleTypeId,
      []
    );
    const { productOptionId: eraOptionId } = await attachOptionToProduct(
      reorderProductId,
      eraTypeId,
      []
    );
    const { productOptionId: finishOptionId } = await attachOptionToProduct(
      reorderProductId,
      finishTypeId,
      []
    );

    let product = await getProductForAdmin(reorderProductId);
    expect(product!.options.map((o) => o.productOptionId)).toEqual([
      styleOptionId,
      eraOptionId,
      finishOptionId,
    ]);

    // A drag can move an item several positions in one drop, not just
    // swap with a neighbor — move finish (last) to first.
    await reorderProductOptions(reorderProductId, [
      finishOptionId,
      styleOptionId,
      eraOptionId,
    ]);
    product = await getProductForAdmin(reorderProductId);
    expect(product!.options.map((o) => o.productOptionId)).toEqual([
      finishOptionId,
      styleOptionId,
      eraOptionId,
    ]);
  });
});

describe("deleteOptionType", () => {
  it("cascades and removes the option from every product using it", async () => {
    const { id: finishTypeId } = await createOptionType(
      "Vitest Finish",
      "buttons"
    );
    const { id: matteId } = await createOptionValue(finishTypeId, "Matte");
    await attachOptionToProduct(productId, finishTypeId, [matteId]);

    await deleteOptionType(finishTypeId);

    const product = await getProductForAdmin(productId);
    expect(
      product!.options.find((o) => o.optionTypeId === finishTypeId)
    ).toBeUndefined();
    const types = await listOptionTypes();
    expect(types.find((t) => t.id === finishTypeId)).toBeUndefined();
  });
});

describe("stock", () => {
  it("is a single per-product capacity number, set via updateProduct", async () => {
    await updateProduct(productId, { ...baseInput, stockQuantity: 9 });

    const product = await getProductForAdmin(productId);
    expect(product!.stockQuantity).toBe(9);

    await updateProduct(productId, baseInput);
  });
});
