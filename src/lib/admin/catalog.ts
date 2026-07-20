import { getSupabaseServerClient } from "@/lib/supabase/server";
import { setPositions } from "@/lib/admin/reorder";

export type OptionDisplayStyle = "buttons" | "dropdown";

// Shop-wide, reusable across every product (see
// docs/PRODUCT_OPTIONS_DESIGN.md's "Third course correction") — the
// /admin/options library page manages these directly.
export type OptionType = {
  id: string;
  name: string;
  displayStyle: OptionDisplayStyle;
  values: { id: string; value: string; position: number }[];
};

// A product's attachment of a shop-wide option type: which of that type's
// values (allValues) this product actually offers (selectedValueIds).
export type AdminProductOption = {
  productOptionId: string;
  optionTypeId: string;
  name: string;
  displayStyle: OptionDisplayStyle;
  position: number;
  allValues: { id: string; value: string; position: number }[];
  selectedValueIds: string[];
};

export type AdminProductPhoto = {
  id: string;
  url: string;
  position: number;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  // Distinct from orderingEnabled: hides the product from the storefront
  // entirely (listing, sitemap, direct PDP access) rather than showing it
  // as unavailable — see supabase/migrations/0012_product_visibility.sql.
  visible: boolean;
  stockQuantity: number;
  // Admin-curated homepage picks (US-38) — see src/lib/admin/reorder.ts's
  // moveFeaturedProduct and setProductFeatured below.
  featured: boolean;
  featuredPosition: number | null;
  photos: AdminProductPhoto[];
  options: AdminProductOption[];
};

const ADMIN_PRODUCT_SELECT =
  "id, slug, name, description, category_id, categories(name), price_centavos, lead_time_days, ordering_enabled, visible, stock_quantity, featured, featured_position, " +
  "product_photos(id, url, position), " +
  "product_options(id, position, option_types(id, name, display_style, option_values(id, value, position)), product_option_selections(option_value_id))";

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: string;
  categories: { name: string } | null;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  visible: boolean;
  stock_quantity: number;
  featured: boolean;
  featured_position: number | null;
  product_photos: { id: string; url: string; position: number }[];
  product_options: {
    id: string;
    position: number;
    option_types: {
      id: string;
      name: string;
      display_style: OptionDisplayStyle;
      option_values: { id: string; value: string; position: number }[];
    };
    product_option_selections: { option_value_id: string }[];
  }[];
};

function mapAdminRow(row: AdminProductRow): AdminProduct {
  const options: AdminProductOption[] = [...row.product_options]
    .sort((a, b) => a.position - b.position)
    .map((po) => ({
      productOptionId: po.id,
      optionTypeId: po.option_types.id,
      name: po.option_types.name,
      displayStyle: po.option_types.display_style,
      position: po.position,
      allValues: [...po.option_types.option_values].sort(
        (a, b) => a.position - b.position
      ),
      selectedValueIds: po.product_option_selections.map(
        (s) => s.option_value_id
      ),
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    category: row.categories?.name ?? "",
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    visible: row.visible,
    stockQuantity: row.stock_quantity,
    featured: row.featured,
    featuredPosition: row.featured_position,
    photos: [...row.product_photos].sort((a, b) => a.position - b.position),
    options,
  };
}

export async function listProductsForAdmin(): Promise<AdminProduct[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as AdminProductRow[]).map(mapAdminRow);
}

export async function getProductForAdmin(
  id: string
): Promise<AdminProduct | undefined> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapAdminRow(data as unknown as AdminProductRow);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ProductInput = {
  name: string;
  description: string;
  categoryId: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  visible: boolean;
  stockQuantity: number;
};

export async function createProduct(
  input: ProductInput
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: slugify(input.name),
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      price_centavos: input.priceCentavos,
      lead_time_days: input.leadTimeDays,
      ordering_enabled: input.orderingEnabled,
      visible: input.visible,
      stock_quantity: input.stockQuantity,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function updateProduct(
  id: string,
  input: ProductInput
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: input.description,
      category_id: input.categoryId,
      price_centavos: input.priceCentavos,
      lead_time_days: input.leadTimeDays,
      ordering_enabled: input.orderingEnabled,
      visible: input.visible,
      stock_quantity: input.stockQuantity,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function addProductPhotos(
  productId: string,
  urls: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("product_photos")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { error } = await supabase.from("product_photos").insert(
    urls.map((url, index) => ({
      product_id: productId,
      url,
      position: nextPosition + index,
    }))
  );

  if (error) throw error;
}

export async function deleteProductPhoto(photoId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_photos")
    .delete()
    .eq("id", photoId);

  if (error) throw error;
}

export async function reorderProductPhotos(
  productId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await setPositions(
    supabase,
    "product_photos",
    { product_id: productId },
    "id",
    "position",
    orderedIds
  );
}

// order_items.product_id has no ON DELETE behavior configured, so a
// product that's actually been ordered would fail at the database level
// anyway — this just gives the admin a clearer error than a raw
// FK-violation message, same pattern as deleteCategory/deletePromoCode.
export async function deleteProduct(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { count, error: countErr } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) {
    throw new Error(
      `Can't delete — this product appears in ${count} past order(s). Hide it instead.`
    );
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

// ─── shop-wide option library (/admin/options) ─────────────────────────

export async function listOptionTypes(): Promise<OptionType[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("option_types")
    .select("id, name, display_style, option_values(id, value, position)")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    displayStyle: t.display_style,
    values: [...t.option_values].sort((a, b) => a.position - b.position),
  }));
}

export async function createOptionType(
  name: string,
  displayStyle: OptionDisplayStyle
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("option_types")
    .insert({ name, display_style: displayStyle })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

// Renaming/restyling is shop-wide by design — applies everywhere this type
// is attached. See docs/PRODUCT_OPTIONS_DESIGN.md's "Third course
// correction".
export async function updateOptionType(
  id: string,
  name: string,
  displayStyle: OptionDisplayStyle
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("option_types")
    .update({ name, display_style: displayStyle })
    .eq("id", id);

  if (error) throw error;
}

// Cascades option_values, product_options, and product_option_selections —
// removes this type from every product using it.
export async function deleteOptionType(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("option_types").delete().eq("id", id);

  if (error) throw error;
}

export async function createOptionValue(
  optionTypeId: string,
  value: string
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("option_values")
    .select("position")
    .eq("option_type_id", optionTypeId)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("option_values")
    .insert({ option_type_id: optionTypeId, value, position: nextPosition })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function updateOptionValue(
  id: string,
  value: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("option_values")
    .update({ value })
    .eq("id", id);

  if (error) throw error;
}

// Cascades product_option_selections — removes this value from every
// product that had it selected.
export async function deleteOptionValue(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("option_values")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── attaching shared options to a product ─────────────────────────────

export async function attachOptionToProduct(
  productId: string,
  optionTypeId: string,
  valueIds: string[]
): Promise<{ productOptionId: string }> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("product_options")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data: productOption, error: insertErr } = await supabase
    .from("product_options")
    .insert({
      product_id: productId,
      option_type_id: optionTypeId,
      position: nextPosition,
    })
    .select("id")
    .single();

  if (insertErr) throw insertErr;

  if (valueIds.length > 0) {
    const { error: selectionErr } = await supabase
      .from("product_option_selections")
      .insert(
        valueIds.map((optionValueId) => ({
          product_option_id: productOption.id,
          option_value_id: optionValueId,
        }))
      );

    if (selectionErr) {
      await supabase.from("product_options").delete().eq("id", productOption.id);
      throw selectionErr;
    }
  }

  return { productOptionId: productOption.id };
}

// Replaces the full selection set — simpler and safer than diffing against
// checkbox state, and this is only ever called with the complete set of
// checked boxes from the product page's selection form.
export async function updateProductOptionSelection(
  productOptionId: string,
  valueIds: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error: deleteErr } = await supabase
    .from("product_option_selections")
    .delete()
    .eq("product_option_id", productOptionId);

  if (deleteErr) throw deleteErr;

  if (valueIds.length > 0) {
    const { error: insertErr } = await supabase
      .from("product_option_selections")
      .insert(
        valueIds.map((optionValueId) => ({
          product_option_id: productOptionId,
          option_value_id: optionValueId,
        }))
      );

    if (insertErr) throw insertErr;
  }
}

// Detach only — doesn't touch the shared option_type/option_values rows,
// which may still be attached to other products.
export async function detachOptionFromProduct(
  productOptionId: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_options")
    .delete()
    .eq("id", productOptionId);

  if (error) throw error;
}

// Persists a product's attached options in the exact order dropped —
// scoped to productId's own product_options rows, not shop-wide. See
// setPositions (src/lib/admin/reorder.ts) for why this writes the full
// order instead of swapping adjacent positions.
export async function reorderProductOptions(
  productId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await setPositions(
    supabase,
    "product_options",
    { product_id: productId },
    "id",
    "position",
    orderedIds
  );
}

// ─── Homepage featured products (US-38) ─────────────────────────────────

export type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  featuredPosition: number;
};

const MAX_FEATURED = 3;

// Ordered by featuredPosition — the exact set/order the homepage's
// featured grid renders (up to 3, US-38). The hero image is a separate,
// standalone settings-driven image with no product association.
export async function listFeaturedProducts(): Promise<FeaturedProduct[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, featured_position")
    .eq("featured", true)
    .order("featured_position", { ascending: true });

  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    featuredPosition: row.featured_position,
  }));
}

// Toggling on: rejects a 4th until one is unfeatured. Toggling off: clears
// featured_position and compacts every remaining featured product with a
// higher position down by one, so positions stay dense (0,1,2 — never a
// gap) for moveFeaturedProduct's boundary checks.
export async function setProductFeatured(
  productId: string,
  featured: boolean
): Promise<void> {
  const supabase = getSupabaseServerClient();

  if (featured) {
    const current = await listFeaturedProducts();
    if (current.length >= MAX_FEATURED) {
      throw new Error(
        `Only ${MAX_FEATURED} products can be featured at once. Unfeature one first.`
      );
    }
    const { error } = await supabase
      .from("products")
      .update({ featured: true, featured_position: current.length })
      .eq("id", productId);
    if (error) throw error;
    return;
  }

  const { data: row, error: fetchErr } = await supabase
    .from("products")
    .select("featured_position")
    .eq("id", productId)
    .single();
  if (fetchErr) throw fetchErr;
  const removedPosition = row.featured_position;

  const { error: clearErr } = await supabase
    .from("products")
    .update({ featured: false, featured_position: null })
    .eq("id", productId);
  if (clearErr) throw clearErr;

  if (removedPosition === null) return;

  const { data: remaining, error: remainingErr } = await supabase
    .from("products")
    .select("id, featured_position")
    .eq("featured", true)
    .gt("featured_position", removedPosition)
    .order("featured_position", { ascending: true });
  if (remainingErr) throw remainingErr;

  for (const row of remaining) {
    const { error } = await supabase
      .from("products")
      .update({ featured_position: row.featured_position - 1 })
      .eq("id", row.id);
    if (error) throw error;
  }
}

export async function reorderFeaturedProducts(
  orderedIds: string[]
): Promise<void> {
  const supabase = getSupabaseServerClient();
  await setPositions(
    supabase,
    "products",
    { featured: true },
    "id",
    "featured_position",
    orderedIds
  );
}
