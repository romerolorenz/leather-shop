import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setPositions } from "@/lib/admin/reorder";

export type Category = {
  id: string;
  name: string;
};

export async function listCategories(): Promise<Category[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export type CategoryProduct = {
  id: string;
  name: string;
  photoUrl: string | null;
  visible: boolean;
  orderingEnabled: boolean;
  stockQuantity: number;
};

export type CategoryWithProducts = Category & {
  products: CategoryProduct[];
};

type CategoryWithProductsRow = {
  id: string;
  name: string;
  position: number;
  products: {
    id: string;
    name: string;
    position: number;
    created_at: string;
    visible: boolean;
    ordering_enabled: boolean;
    stock_quantity: number;
    product_photos: { url: string; position: number }[];
  }[];
};

// Powers /admin/categories: the categories in shop order (migration 0027),
// each with its products in shop order, so the page can both show what's
// attached before a rename/delete and let the owner drag the shop's
// arrangement. Same tie-breaks as the storefront's compareShopOrder
// (src/lib/products.ts), so the admin list and /products always agree.
export async function listCategoriesWithProducts(): Promise<
  CategoryWithProducts[]
> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, name, position, products(id, name, position, created_at, visible, ordering_enabled, stock_quantity, product_photos(url, position))"
    )
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw error;
  return (data as unknown as CategoryWithProductsRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    products: [...row.products]
      .sort(
        (a, b) =>
          a.position - b.position ||
          a.created_at.localeCompare(b.created_at) ||
          a.id.localeCompare(b.id)
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        photoUrl:
          [...product.product_photos].sort((a, b) => a.position - b.position)[0]
            ?.url ?? null,
        visible: product.visible,
        orderingEnabled: product.ordering_enabled,
        stockQuantity: product.stock_quantity,
      })),
  }));
}

// The reorder actions take their argument straight from the browser, so
// anything other than a list of id strings is refused (shown to the admin
// as an error toast) instead of reaching the database. Duplicates are
// dropped so no two rows get the same position.
function readOrderedIds(orderedIds: unknown): string[] {
  if (
    !Array.isArray(orderedIds) ||
    !orderedIds.every((id) => typeof id === "string" && id.length > 0)
  ) {
    throw new Error("Couldn't save the new order. Refresh the page and try again.");
  }
  return [...new Set(orderedIds as string[])];
}

// Drag-and-drop on /admin/categories sends the full new order. New
// categories get their end-of-list position from a trigger (0027).
export async function reorderCategories(orderedIds: unknown): Promise<void> {
  const ids = readOrderedIds(orderedIds);
  const supabase = getSupabaseServerClient();
  await setPositions(supabase, "categories", {}, "id", "position", ids);
}

// Products' positions are per category. The list comes from the admin's
// page, which can be stale (another tab added or moved a product since):
//   - ids no longer in this category are skipped;
//   - products in the category that the list doesn't mention keep their
//     current relative order and go after the listed ones.
// So every product in the category gets a unique, dense position.
export async function reorderCategoryProducts(
  categoryId: string,
  orderedIds: unknown
): Promise<void> {
  const ids = readOrderedIds(orderedIds);
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, position, created_at")
    .eq("category_id", categoryId);
  if (error) throw error;

  const current = [...data]
    .sort(
      (a, b) =>
        a.position - b.position ||
        a.created_at.localeCompare(b.created_at) ||
        a.id.localeCompare(b.id)
    )
    .map((row) => row.id as string);
  const inCategory = new Set(current);
  const listed = ids.filter((id) => inCategory.has(id));
  const listedSet = new Set(listed);
  const finalOrder = [...listed, ...current.filter((id) => !listedSet.has(id))];

  await setPositions(
    supabase,
    "products",
    { category_id: categoryId },
    "id",
    "position",
    finalOrder
  );
}

export async function createCategory(name: string): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

// products.category_id has no ON DELETE behavior configured, so a
// referenced category would fail at the database level anyway — this just
// gives the admin a clearer error than a raw FK-violation message.
export async function deleteCategory(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { count, error: countErr } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Can't delete — ${count} product(s) still use this category.`
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
