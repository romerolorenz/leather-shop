import { afterAll, describe, expect, it } from "vitest";
import {
  createCategory,
  listCategories,
  listCategoriesWithProducts,
  updateCategory,
} from "@/lib/admin/categories";
import { createProduct } from "@/lib/admin/catalog";
import { getProducts, groupProductsByCategory } from "@/lib/products";
import {
  CATEGORY_DESCRIPTION_MAX,
  normalizeCategoryDescription,
} from "@/lib/category-description";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CleanupErrors, deleteRowsById } from "./helpers/cleanup";

// Category descriptions (docs/design/category-descriptions.md, migration
// 0028). Runs against the real (dev) Supabase project with scratch
// categories and products only; each id is queued for cleanup straight
// from the insert, before any assertion can throw. Products go before
// categories (FK).

const scratchCategoryIds: string[] = [];
const scratchProductIds: string[] = [];

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteRowsById(errors, "products", scratchProductIds);
  await deleteRowsById(errors, "categories", scratchCategoryIds);
  errors.throwIfAny();
});

const RUN = Date.now();
const name = (label: string) => `Vitest Category Description ${label} ${RUN}`;

async function makeCategory(
  label: string,
  description?: string | null
): Promise<string> {
  const { id } = await createCategory(name(label), description);
  scratchCategoryIds.push(id);
  return id;
}

async function storedDescription(id: string): Promise<string | null> {
  const category = (await listCategories()).find((c) => c.id === id);
  if (!category) throw new Error(`Category ${id} not found`);
  return category.description;
}

describe("normalizeCategoryDescription", () => {
  it("trims and collapses whitespace and newlines to single spaces", () => {
    expect(
      normalizeCategoryDescription("  Thick   vegetable-tanned\n\nleather,\t hand-stitched.  ")
    ).toBe("Thick vegetable-tanned leather, hand-stitched.");
  });

  it("stores blank or missing as null", () => {
    expect(normalizeCategoryDescription("")).toBeNull();
    expect(normalizeCategoryDescription("   \n\t ")).toBeNull();
    expect(normalizeCategoryDescription(null)).toBeNull();
    expect(normalizeCategoryDescription(undefined)).toBeNull();
  });

  it("allows exactly the limit, counted after collapsing", () => {
    const atLimit = "a".repeat(CATEGORY_DESCRIPTION_MAX);
    expect(normalizeCategoryDescription(atLimit)).toBe(atLimit);
    // 200 letters plus padding that collapses away is still fine.
    expect(normalizeCategoryDescription(`  ${atLimit}\n `)).toBe(atLimit);
  });

  it("rejects anything over the limit with a clear message", () => {
    expect(() =>
      normalizeCategoryDescription("a".repeat(CATEGORY_DESCRIPTION_MAX + 1))
    ).toThrow("Description must be 200 characters or fewer.");
  });

  it("counts characters the way Postgres does (an emoji is one)", () => {
    const emojis = "👜".repeat(CATEGORY_DESCRIPTION_MAX);
    expect(normalizeCategoryDescription(emojis)).toBe(emojis);
  });
});

describe("category descriptions in the admin", () => {
  it("creates a category with a normalised description", async () => {
    const id = await makeCategory("Create", "  Totes and\ncrossbodies.  ");
    expect(await storedDescription(id)).toBe("Totes and crossbodies.");
  });

  it("creates a category with no description as null", async () => {
    const blank = await makeCategory("Create Blank", "   ");
    const omitted = await makeCategory("Create Omitted");
    expect(await storedDescription(blank)).toBeNull();
    expect(await storedDescription(omitted)).toBeNull();
  });

  it("refuses to create a category with a description over the limit", async () => {
    const tooLong = "a".repeat(CATEGORY_DESCRIPTION_MAX + 1);
    const created = createCategory(name("Create Too Long"), tooLong);
    // If it ever does get created, queue it for cleanup before asserting.
    await created.then(
      ({ id }) => scratchCategoryIds.push(id),
      () => undefined
    );
    await expect(created).rejects.toThrow(/200 characters or fewer/);
    expect((await listCategories()).map((c) => c.name)).not.toContain(
      name("Create Too Long")
    );
  });

  it("updates name and description together, and clears it with blank", async () => {
    const id = await makeCategory("Update");

    await updateCategory(id, {
      name: name("Update Renamed"),
      description: "Card holders\n and  wallets.",
    });
    let category = (await listCategoriesWithProducts()).find((c) => c.id === id);
    expect(category?.name).toBe(name("Update Renamed"));
    expect(category?.description).toBe("Card holders and wallets.");

    await updateCategory(id, { name: name("Update Renamed"), description: "" });
    category = (await listCategoriesWithProducts()).find((c) => c.id === id);
    expect(category?.description).toBeNull();
  });

  it("rejects an over-long description on update and keeps the saved one", async () => {
    const id = await makeCategory("Update Too Long", "Kept as is.");
    await expect(
      updateCategory(id, {
        name: name("Update Too Long"),
        description: "a".repeat(CATEGORY_DESCRIPTION_MAX + 1),
      })
    ).rejects.toThrow("Description must be 200 characters or fewer.");
    expect(await storedDescription(id)).toBe("Kept as is.");
  });

  it("requires a name", async () => {
    const id = await makeCategory("Name Required");
    await expect(
      updateCategory(id, { name: "   ", description: "Anything." })
    ).rejects.toThrow("Category name is required.");
  });

  it("leaves the description alone on a name-only update", async () => {
    const id = await makeCategory("Name Only", "Stays.");
    await updateCategory(id, { name: name("Name Only Renamed") });
    expect(await storedDescription(id)).toBe("Stays.");
  });

  it("names a duplicate category instead of a raw database error", async () => {
    await makeCategory("Duplicate");
    const second = createCategory(name("Duplicate"));
    await second.then(
      ({ id }) => scratchCategoryIds.push(id),
      () => undefined
    );
    await expect(second).rejects.toThrow(
      "A category with that name already exists."
    );
  });

  it("is enforced by the database too (migration 0028's check)", async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: name("Direct Insert"),
        description: "a".repeat(CATEGORY_DESCRIPTION_MAX + 1),
      })
      .select("id");
    if (data?.[0]) scratchCategoryIds.push(data[0].id);
    expect(error?.code).toBe("23514");
  });
});

describe("category descriptions on the shop", () => {
  it("carry through to the /products sections", async () => {
    const withText = await makeCategory("Shop With", "Thick leather totes.");
    const without = await makeCategory("Shop Without");
    for (const [label, categoryId] of [
      ["A", withText],
      ["B", without],
    ] as const) {
      const { id } = await createProduct({
        name: name(`Shop Product ${label}`),
        description: "",
        categoryId,
        priceCentavos: 10000,
        leadTimeDays: 1,
        orderingEnabled: true,
        visible: true,
        stockQuantity: 1,
      });
      scratchProductIds.push(id);
    }

    const sections = groupProductsByCategory(await getProducts());
    const byId = new Map(sections.map((s) => [s.categoryId, s]));
    expect(byId.get(withText)?.description).toBe("Thick leather totes.");
    expect(byId.get(without)?.description).toBeNull();

    // A later edit shows up on the next read.
    await updateCategory(withText, {
      name: name("Shop With"),
      description: "Now for weekend bags.",
    });
    const after = groupProductsByCategory(await getProducts());
    expect(after.find((s) => s.categoryId === withText)?.description).toBe(
      "Now for weekend bags."
    );
  });
});
