import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AdminProductOptionValue = {
  id: string;
  value: string;
  position: number;
};

export type OptionDisplayStyle = "buttons" | "dropdown";

export type AdminProductOptionType = {
  id: string;
  name: string;
  position: number;
  displayStyle: OptionDisplayStyle;
  values: AdminProductOptionValue[];
};

// label is composed from the variant's option values (in option-type
// position order) — never typed directly, see createVariant.
export type AdminProductVariant = {
  id: string;
  label: string;
  optionValueIds: string[];
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
  stockQuantity: number;
  photos: AdminProductPhoto[];
  optionTypes: AdminProductOptionType[];
  variants: AdminProductVariant[];
};

const ADMIN_PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity, " +
  "product_photos(id, url, position), " +
  "product_option_types(id, name, position, display_style, product_option_values(id, value, position)), " +
  "product_variants(id, product_variant_options(option_value_id))";

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  stock_quantity: number;
  product_photos: { id: string; url: string; position: number }[];
  product_option_types: {
    id: string;
    name: string;
    position: number;
    display_style: OptionDisplayStyle;
    product_option_values: { id: string; value: string; position: number }[];
  }[];
  product_variants: {
    id: string;
    product_variant_options: { option_value_id: string }[];
  }[];
};

function mapAdminRow(row: AdminProductRow): AdminProduct {
  const optionTypes: AdminProductOptionType[] = [...row.product_option_types]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({
      id: t.id,
      name: t.name,
      position: t.position,
      displayStyle: t.display_style,
      values: [...t.product_option_values].sort(
        (a, b) => a.position - b.position
      ),
    }));

  // option value id -> its text + its option type's position, so a
  // variant's label can be composed in the same order the type list is
  // shown in, regardless of the order option_value_ids happen to be in.
  const valueLookup = new Map<string, { value: string; typePosition: number }>();
  for (const type of optionTypes) {
    for (const v of type.values) {
      valueLookup.set(v.id, { value: v.value, typePosition: type.position });
    }
  }

  const variants: AdminProductVariant[] = row.product_variants.map((v) => {
    const optionValueIds = v.product_variant_options.map(
      (o) => o.option_value_id
    );
    const label = optionValueIds
      .map((id) => valueLookup.get(id))
      .filter((x): x is { value: string; typePosition: number } => !!x)
      .sort((a, b) => a.typePosition - b.typePosition)
      .map((x) => x.value)
      .join(" / ");

    return {
      id: v.id,
      label,
      optionValueIds,
    };
  });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    stockQuantity: row.stock_quantity,
    photos: [...row.product_photos].sort((a, b) => a.position - b.position),
    optionTypes,
    variants,
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

export async function createOptionType(
  productId: string,
  name: string,
  displayStyle: OptionDisplayStyle
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("product_option_types")
    .select("position")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("product_option_types")
    .insert({
      product_id: productId,
      name,
      position: nextPosition,
      display_style: displayStyle,
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id };
}

export async function updateOptionType(
  id: string,
  name: string,
  displayStyle: OptionDisplayStyle
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_option_types")
    .update({ name, display_style: displayStyle })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteOptionType(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_option_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function createOptionValue(
  optionTypeId: string,
  value: string
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("product_option_values")
    .select("position")
    .eq("option_type_id", optionTypeId)
    .order("position", { ascending: false })
    .limit(1);

  if (fetchErr) throw fetchErr;

  const nextPosition = (existing?.[0]?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("product_option_values")
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
    .from("product_option_values")
    .update({ value })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteOptionValue(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_option_values")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export class DuplicateVariantError extends Error {
  constructor() {
    super("A variant with this exact combination already exists.");
    this.name = "DuplicateVariantError";
  }
}

// A variant's combination is fixed at creation — nothing about it is
// editable afterward. To change the combination, delete and re-add. Stock
// is a single per-product capacity number (see ProductInput.stockQuantity),
// not a per-variant field.
export async function createVariant(
  productId: string,
  optionValueIds: string[]
): Promise<{ id: string }> {
  const supabase = getSupabaseServerClient();

  // No DB constraint can express "no two variants share the same full set
  // of option values" across a variable-length join table — checked here
  // instead by comparing sorted id sets against every existing variant.
  const { data: existingVariants, error: fetchErr } = await supabase
    .from("product_variants")
    .select("id, product_variant_options(option_value_id)")
    .eq("product_id", productId);

  if (fetchErr) throw fetchErr;

  const sortedNew = [...optionValueIds].sort().join(",");
  const isDuplicate = (existingVariants ?? []).some((v) => {
    const ids = v.product_variant_options.map(
      (o: { option_value_id: string }) => o.option_value_id
    );
    return [...ids].sort().join(",") === sortedNew;
  });

  if (isDuplicate) throw new DuplicateVariantError();

  const { data: variant, error: insertErr } = await supabase
    .from("product_variants")
    .insert({ product_id: productId })
    .select("id")
    .single();

  if (insertErr) throw insertErr;

  const { error: linkErr } = await supabase.from("product_variant_options").insert(
    optionValueIds.map((optionValueId) => ({
      variant_id: variant.id,
      option_value_id: optionValueId,
    }))
  );

  if (linkErr) {
    await supabase.from("product_variants").delete().eq("id", variant.id);
    throw linkErr;
  }

  return { id: variant.id };
}

export async function deleteVariant(variantId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) throw error;
}
