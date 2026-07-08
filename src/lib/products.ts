import { getSupabaseServerClient } from "@/lib/supabase/server";

export type ProductOptionType = {
  id: string;
  name: string;
  values: string[];
};

export type ProductVariant = {
  id: string;
  label: string;
  options: Record<string, string>; // option type name -> chosen value
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
  optionTypes: ProductOptionType[];
  variants: ProductVariant[];
  description: string;
  photos: string[];
};

const PRODUCT_SELECT =
  "id, slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, " +
  "product_photos(url, position), " +
  "product_option_types(id, name, position, product_option_values(id, value, position)), " +
  "product_variants(id, in_stock, product_variant_options(option_value_id))";

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
  product_option_types: {
    id: string;
    name: string;
    position: number;
    product_option_values: { id: string; value: string; position: number }[];
  }[];
  product_variants: {
    id: string;
    in_stock: boolean;
    product_variant_options: { option_value_id: string }[];
  }[];
};

function mapRow(row: ProductRow): Product {
  const sortedTypes = [...row.product_option_types].sort(
    (a, b) => a.position - b.position
  );

  const optionTypes: ProductOptionType[] = sortedTypes.map((t) => ({
    id: t.id,
    name: t.name,
    values: [...t.product_option_values]
      .sort((a, b) => a.position - b.position)
      .map((v) => v.value),
  }));

  // option value id -> its text + which option type (name + position) it
  // belongs to, so a variant's options/label can be composed in the same
  // order optionTypes is shown in.
  const valueLookup = new Map<
    string,
    { value: string; typeName: string; typePosition: number }
  >();
  for (const t of sortedTypes) {
    for (const v of t.product_option_values) {
      valueLookup.set(v.id, {
        value: v.value,
        typeName: t.name,
        typePosition: t.position,
      });
    }
  }

  const variants: ProductVariant[] = row.product_variants.map((v) => {
    const resolved = v.product_variant_options
      .map((o) => valueLookup.get(o.option_value_id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => a.typePosition - b.typePosition);

    return {
      id: v.id,
      label: resolved.map((x) => x.value).join(" / "),
      options: Object.fromEntries(resolved.map((x) => [x.typeName, x.value])),
      inStock: v.in_stock,
    };
  });

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
    optionTypes,
    variants,
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
