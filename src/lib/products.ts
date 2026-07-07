import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProductVariant = {
  id: string;
  label: string;
  inStock: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  variants: ProductVariant[];
  description: string;
  photos: string[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, product_photos(url, position), product_variants(id, label, in_stock)";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  product_photos: { url: string; position: number }[];
  product_variants: { id: string; label: string; in_stock: boolean }[];
};

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    description: row.description,
    photos: [...row.product_photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => p.url),
    variants: row.product_variants.map((v) => ({
      id: v.id,
      label: v.label,
      inStock: v.in_stock,
    })),
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as ProductRow[]).map(mapRow);
}

export async function getProductBySlug(
  slug: string
): Promise<Product | undefined> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return undefined;
  return mapRow(data as ProductRow);
}

export function formatPrice(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;
}
