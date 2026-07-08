import { getSupabaseServerClient } from "@/lib/supabase/server";

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
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  // Distinct from orderingEnabled: hides the product from the storefront
  // entirely (listing, sitemap, direct PDP access) rather than showing it
  // as unavailable — see supabase/migrations/0012_product_visibility.sql.
  visible: boolean;
  stockQuantity: number;
  photos: AdminProductPhoto[];
  options: AdminProductOption[];
};

const ADMIN_PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, visible, stock_quantity, " +
  "product_photos(id, url, position), " +
  "product_options(id, position, option_types(id, name, display_style, option_values(id, value, position)), product_option_selections(option_value_id))";

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  visible: boolean;
  stock_quantity: number;
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
    category: row.category,
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    visible: row.visible,
    stockQuantity: row.stock_quantity,
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
  category: string;
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
      category: input.category,
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
      category: input.category,
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

// Swaps this product's attached option with its neighbor — same
// swap-adjacent-position approach as moveFaqItem (src/lib/admin/faq.ts).
// Scoped to productId's own product_options rows, not shop-wide.
export async function moveProductOption(
  productId: string,
  productOptionId: string,
  direction: "up" | "down"
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { data: options, error } = await supabase
    .from("product_options")
    .select("id, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });

  if (error) throw error;

  const index = options.findIndex((o) => o.id === productOptionId);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= options.length) return;

  const current = options[index];
  const swap = options[swapIndex];

  const { error: currentErr } = await supabase
    .from("product_options")
    .update({ position: swap.position })
    .eq("id", current.id);
  if (currentErr) throw currentErr;

  const { error: swapErr } = await supabase
    .from("product_options")
    .update({ position: current.position })
    .eq("id", swap.id);
  if (swapErr) throw swapErr;
}
