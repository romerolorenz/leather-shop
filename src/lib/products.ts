import { getSupabaseServerClient } from "@/lib/supabase/server";

export type OptionDisplayStyle = "buttons" | "dropdown";

export type ProductOptionType = {
  id: string;
  name: string;
  displayStyle: OptionDisplayStyle;
  values: string[];
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  // Distinct from orderingEnabled — hidden entirely from the storefront
  // rather than shown as unavailable. getProducts() already filters these
  // out; getProductBySlug() doesn't (order history needs to resolve a
  // since-hidden product), so callers reachable by direct slug (the PDP,
  // checkout) must check this themselves.
  visible: boolean;
  // A single per-product capacity number, not per option combination — see
  // PRD §5. Every option combination is orderable or sold out together.
  inStock: boolean;
  // Admin-curated homepage featured grid (US-38, up to 3) — the hero image
  // is a separate, standalone settings-driven image with no product tie.
  // featuredPosition is the grid render order; null when not featured.
  featured: boolean;
  featuredPosition: number | null;
  optionTypes: ProductOptionType[];
  description: string;
  // Both optional and independent — admin's discretion what goes in each,
  // no fixed sub-fields. Null/absent means the storefront's "Product
  // Details" section doesn't render at all rather than showing empty.
  dimensions: string | null;
  details: string | null;
  photos: string[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, category_id, categories(name), price_centavos, lead_time_days, ordering_enabled, visible, in_stock, featured, featured_position, dimensions, details, " +
  "product_photos(url, position), " +
  "product_options(position, option_types(id, name, display_style), product_option_selections(option_values(value, position)))";

type ProductRow = {
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
  in_stock: boolean;
  featured: boolean;
  featured_position: number | null;
  dimensions: string | null;
  details: string | null;
  product_photos: { url: string; position: number }[];
  product_options: {
    position: number;
    option_types: {
      id: string;
      name: string;
      display_style: OptionDisplayStyle;
    };
    product_option_selections: {
      option_values: { value: string; position: number };
    }[];
  }[];
};

function mapRow(row: ProductRow): Product {
  const optionTypes: ProductOptionType[] = [...row.product_options]
    // An option attached to a product with no values selected yet (admin
    // attached it but hasn't picked a subset) has nothing orderable to
    // show — hide it from the storefront rather than rendering an empty
    // swatch row/dropdown.
    .filter((po) => po.product_option_selections.length > 0)
    .sort((a, b) => a.position - b.position)
    .map((po) => ({
      id: po.option_types.id,
      name: po.option_types.name,
      displayStyle: po.option_types.display_style,
      values: [...po.product_option_selections]
        .map((s) => s.option_values)
        .sort((a, b) => a.position - b.position)
        .map((v) => v.value),
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    categoryId: row.category_id,
    category: row.categories?.name ?? "",
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    visible: row.visible,
    inStock: row.in_stock,
    featured: row.featured,
    featuredPosition: row.featured_position,
    description: row.description,
    dimensions: row.dimensions,
    details: row.details,
    photos: [...row.product_photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => p.url),
    optionTypes,
  };
}

// Listing/sitemap use — hidden products are excluded outright, not shown
// as unavailable.
export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("visible", true)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapRow);
}

// Deliberately not filtered by visible — order history (getOrderItemPhotos
// in src/lib/orders.ts) needs to resolve a since-hidden product's photo.
// Callers reachable by direct slug from a customer (the PDP, checkout)
// must check product.visible themselves.
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
  return mapRow(data as unknown as ProductRow);
}

export function formatPrice(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;
}
