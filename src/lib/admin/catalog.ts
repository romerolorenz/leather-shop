import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AdminProductVariant = {
  id: string;
  label: string;
  stockQuantity: number;
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
  photoUrl: string | null;
  variants: AdminProductVariant[];
};

const ADMIN_PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, photo_url, product_variants(id, label, stock_quantity)";

type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  photo_url: string | null;
  product_variants: { id: string; label: string; stock_quantity: number }[];
};

function mapAdminRow(row: AdminProductRow): AdminProduct {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    photoUrl: row.photo_url,
    variants: row.product_variants.map((v) => ({
      id: v.id,
      label: v.label,
      stockQuantity: v.stock_quantity,
    })),
  };
}

export async function listProductsForAdmin(): Promise<AdminProduct[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as AdminProductRow[]).map(mapAdminRow);
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
  return mapAdminRow(data as AdminProductRow);
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
    })
    .eq("id", id);

  if (error) throw error;
}

export async function setProductPhotoUrl(
  productId: string,
  photoUrl: string
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({ photo_url: photoUrl })
    .eq("id", productId);

  if (error) throw error;
}

export async function addVariant(
  productId: string,
  label: string,
  stockQuantity: number
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .insert({ product_id: productId, label, stock_quantity: stockQuantity });

  if (error) throw error;
}

export async function updateVariant(
  variantId: string,
  label: string,
  stockQuantity: number
): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .update({ label, stock_quantity: stockQuantity })
    .eq("id", variantId);

  if (error) throw error;
}

export async function deleteVariant(variantId: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId);

  if (error) throw error;
}
