import { afterAll, describe, expect, it } from "vitest";
import {
  createCategory,
  listCategories,
  listCategoriesWithProducts,
  reorderCategories,
  reorderCategoryProducts,
} from "@/lib/admin/categories";
import {
  createProduct,
  updateProduct,
  type ProductInput,
} from "@/lib/admin/catalog";
import {
  getProducts,
  groupProductsByCategory,
  type Product,
} from "@/lib/products";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CleanupErrors, deleteRowsById } from "./helpers/cleanup";

// Shop order (docs/design/shop-order.md, migration 0027). Runs against the
// real (dev) Supabase project with scratch categories and products only.
// Reordering only ever names the scratch categories, so the real ones keep
// their positions; the scratch ones sort to the front while the file runs
// and are deleted at the end. Products go before categories (FK).

const scratchCategoryIds: string[] = [];
const scratchProductIds: string[] = [];

afterAll(async () => {
  const errors = new CleanupErrors();
  await deleteRowsById(errors, "products", scratchProductIds);
  await deleteRowsById(errors, "categories", scratchCategoryIds);
  errors.throwIfAny();
});

const RUN = Date.now();

// The id comes back from the insert itself and is queued for cleanup
// before anything else can throw.
async function makeCategory(label: string): Promise<string> {
  const name = `Vitest Shop Order ${label} ${RUN}`;
  const { id } = await createCategory(name);
  scratchCategoryIds.push(id);
  expect((await listCategories()).map((c) => c.id)).toContain(id);
  return id;
}

function productInput(
  name: string,
  categoryId: string,
  overrides: Partial<ProductInput> = {}
): ProductInput {
  return {
    name: `Vitest Shop Order ${name} ${RUN}`,
    description: "",
    categoryId,
    priceCentavos: 10000,
    leadTimeDays: 1,
    orderingEnabled: true,
    visible: true,
    stockQuantity: 1,
    ...overrides,
  };
}

async function makeProduct(
  name: string,
  categoryId: string,
  overrides: Partial<ProductInput> = {}
): Promise<string> {
  const { id } = await createProduct(productInput(name, categoryId, overrides));
  scratchProductIds.push(id);
  return id;
}

async function positionsOf(
  table: "categories" | "products",
  ids: string[]
): Promise<Record<string, number>> {
  const { data, error } = await getSupabaseServerClient()
    .from(table)
    .select("id, position")
    .in("id", ids);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.id, row.position]));
}

async function maxPosition(
  table: "categories" | "products",
  filter: { column: string; value: string } | null,
  excludeIds: string[]
): Promise<number> {
  let query = getSupabaseServerClient().from(table).select("id, position");
  if (filter) query = query.eq(filter.column, filter.value);
  const { data, error } = await query;
  if (error) throw error;
  const others = data.filter((row) => !excludeIds.includes(row.id));
  return Math.max(-1, ...others.map((row) => row.position));
}

async function productIdsIn(categoryId: string): Promise<string[]> {
  const category = (await listCategoriesWithProducts()).find(
    (c) => c.id === categoryId
  );
  return category?.products.map((p) => p.id) ?? [];
}

describe("new rows go last", () => {
  it("puts a new category after every existing one", async () => {
    const id = await makeCategory("Last");
    const positions = await positionsOf("categories", [id]);
    expect(positions[id]).toBeGreaterThan(
      await maxPosition("categories", null, [id])
    );
  });

  it("puts a new product at the end of its category", async () => {
    const categoryId = await makeCategory("New Product");
    const first = await makeProduct("First", categoryId);
    const second = await makeProduct("Second", categoryId);

    const positions = await positionsOf("products", [first, second]);
    expect(positions[second]).toBeGreaterThan(positions[first]);
    expect(await productIdsIn(categoryId)).toEqual([first, second]);
  });

  it("moves a product to the end of its new category when its category changes", async () => {
    const from = await makeCategory("Move From");
    const to = await makeCategory("Move To");
    const moving = await makeProduct("Moving", from);
    const alreadyThere = await makeProduct("Already There", to);
    const alsoThere = await makeProduct("Also There", to);

    await updateProduct(moving, productInput("Moving", to));

    expect(await productIdsIn(to)).toEqual([alreadyThere, alsoThere, moving]);
    expect(await productIdsIn(from)).toEqual([]);
  });

  it("keeps a product's position when it's saved without a category change", async () => {
    const categoryId = await makeCategory("Same Category");
    const a = await makeProduct("Stay A", categoryId);
    const b = await makeProduct("Stay B", categoryId);

    await updateProduct(a, productInput("Stay A", categoryId, { priceCentavos: 20000 }));

    expect(await productIdsIn(categoryId)).toEqual([a, b]);
  });
});

describe("reordering", () => {
  it("persists a new category order", async () => {
    const x = await makeCategory("Order X");
    const y = await makeCategory("Order Y");
    const z = await makeCategory("Order Z");

    await reorderCategories([z, x, y]);

    const ids = (await listCategoriesWithProducts()).map((c) => c.id);
    const scratchOrder = ids.filter((id) => [x, y, z].includes(id));
    expect(scratchOrder).toEqual([z, x, y]);
  });

  it("persists a new product order within a category", async () => {
    const categoryId = await makeCategory("Product Order");
    const a = await makeProduct("Order A", categoryId);
    const b = await makeProduct("Order B", categoryId);
    const c = await makeProduct("Order C", categoryId);

    await reorderCategoryProducts(categoryId, [c, a, b]);

    expect(await productIdsIn(categoryId)).toEqual([c, a, b]);
  });

  it("puts products the list leaves out (a stale tab) after the listed ones", async () => {
    const categoryId = await makeCategory("Stale List");
    const a = await makeProduct("Stale A", categoryId);
    const b = await makeProduct("Stale B", categoryId);
    const c = await makeProduct("Stale C", categoryId);
    // Added after the admin's page loaded, so their list doesn't have it.
    const d = await makeProduct("Stale D", categoryId);

    await reorderCategoryProducts(categoryId, [c, a, a]);

    expect(await productIdsIn(categoryId)).toEqual([c, a, b, d]);
    const positions = Object.values(await positionsOf("products", [a, b, c, d]));
    expect(new Set(positions).size).toBe(4);
  });

  it.each([
    ["not an array", "abc"],
    ["null", null],
    ["a non-string id", [1, 2]],
    ["an empty id", [""]],
  ])("rejects an ordered-id list that is %s", async (_label, bad) => {
    await expect(reorderCategories(bad)).rejects.toThrow(/Couldn't save the new order/);
    await expect(
      reorderCategoryProducts("00000000-0000-0000-0000-000000000000", bad)
    ).rejects.toThrow(/Couldn't save the new order/);
  });

  it("ignores a product that isn't in the category being reordered", async () => {
    const home = await makeCategory("Stale Home");
    const other = await makeCategory("Stale Other");
    const mine = await makeProduct("Stale Mine", home);
    const elsewhere = await makeProduct("Stale Elsewhere", other);
    const before = await positionsOf("products", [elsewhere]);

    // e.g. a stale admin tab that still lists `elsewhere` under `home`.
    await reorderCategoryProducts(home, [elsewhere, mine]);

    expect(await positionsOf("products", [elsewhere])).toEqual(before);
  });
});

describe("storefront order (getProducts + groupProductsByCategory)", () => {
  it("lists categories in admin order, products in admin order, and skips categories with nothing visible", async () => {
    const wallets = await makeCategory("Shop Wallets");
    const bags = await makeCategory("Shop Bags");
    const hiddenOnly = await makeCategory("Shop Hidden Only");

    const w1 = await makeProduct("Shop W1", wallets);
    const w2 = await makeProduct("Shop W2", wallets, { orderingEnabled: false });
    const b1 = await makeProduct("Shop B1", bags, { stockQuantity: 0 });
    const b2 = await makeProduct("Shop B2", bags);
    const hiddenInBags = await makeProduct("Shop Hidden In Bags", bags, {
      visible: false,
    });
    await makeProduct("Shop Hidden", hiddenOnly, { visible: false });

    await reorderCategories([bags, wallets, hiddenOnly]);
    await reorderCategoryProducts(bags, [b2, hiddenInBags, b1]);
    await reorderCategoryProducts(wallets, [w2, w1]);

    const products = await getProducts();
    const scratch = new Set([wallets, bags, hiddenOnly]);
    const sections = groupProductsByCategory(products).filter((s) =>
      scratch.has(s.categoryId)
    );

    // Bags first, as arranged; the all-hidden category doesn't appear.
    // Paused (w2) and sold-out (b1) products stay where they were put.
    expect(sections.map((s) => s.categoryId)).toEqual([bags, wallets]);
    expect(sections[0].products.map((p) => p.id)).toEqual([b2, b1]);
    expect(sections[1].products.map((p) => p.id)).toEqual([w2, w1]);
    expect(sections[0].name).toBe(`Vitest Shop Order Shop Bags ${RUN}`);
  });
});

describe("groupProductsByCategory", () => {
  function product(id: string, categoryId: string): Product {
    return {
      id,
      slug: id,
      name: id,
      categoryId,
      category: `Category ${categoryId}`,
      categoryDescription: null,
      categoryPosition: 0,
      position: 0,
      createdAt: "2026-01-01T00:00:00Z",
      priceCentavos: 100,
      leadTimeDays: 1,
      orderingEnabled: true,
      visible: true,
      inStock: true,
      featured: false,
      featuredPosition: null,
      optionTypes: [],
      description: "",
      dimensions: null,
      details: null,
      photos: [],
    };
  }

  it("keeps the incoming order of categories and products", () => {
    const sections = groupProductsByCategory([
      product("b1", "B"),
      product("b2", "B"),
      product("a1", "A"),
    ]);
    expect(sections.map((s) => [s.categoryId, s.name])).toEqual([
      ["B", "Category B"],
      ["A", "Category A"],
    ]);
    expect(sections[0].products.map((p) => p.id)).toEqual(["b1", "b2"]);
    expect(sections[1].products.map((p) => p.id)).toEqual(["a1"]);
  });

  it("returns no sections for no products", () => {
    expect(groupProductsByCategory([])).toEqual([]);
  });
});
