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
  category: string;
  priceCentavos: number;
  leadTimeDays: number;
  orderingEnabled: boolean;
  // A single per-product capacity number, not per option combination — see
  // PRD §5. Every option combination is orderable or sold out together.
  inStock: boolean;
  optionTypes: ProductOptionType[];
  description: string;
  photos: string[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, in_stock, " +
  "product_photos(url, position), " +
  "product_options(position, option_types(id, name, display_style), product_option_selections(option_values(value, position)))";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_centavos: number;
  lead_time_days: number;
  ordering_enabled: boolean;
  in_stock: boolean;
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
    category: row.category,
    priceCentavos: row.price_centavos,
    leadTimeDays: row.lead_time_days,
    orderingEnabled: row.ordering_enabled,
    inStock: row.in_stock,
    description: row.description,
    photos: [...row.product_photos]
      .sort((a, b) => a.position - b.position)
      .map((p) => p.url),
    optionTypes,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as unknown as ProductRow[]).map(mapRow);
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
  return mapRow(data as unknown as ProductRow);
}

export function formatPrice(centavos: number): string {
  return `₱${(centavos / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  })}`;
}
