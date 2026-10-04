import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Settings = {
  shippingFeeCentavos: number;
  deliveryCities: string[];
  adminNotificationEmail: string;
  orderPaymentHoldHours: number;
  contactEmail: string;
  contactInstagramUrl: string;
  contactInstagramHandle: string;
  heroImageUrl: string | null;
  heroFocalX: number;
  heroFocalY: number;
  homepageHeroEyebrow: string;
  homepageHeroHeadline: string;
  homepageFeaturedEyebrow: string;
  homepageFeaturedHeading: string;
  homepageStudioHeading: string;
  homepageStudioBody: string;
  // Studio photo + maker profile (docs/design/studio-profile.md).
  homepageStudioImageUrl: string | null;
  homepageStudioFocalX: number;
  homepageStudioFocalY: number;
  homepageStudioImageAlt: string;
  homepageStudioPortraitUrl: string | null;
  homepageStudioQuote: string;
  homepageStudioName: string;
  homepageStudioRole: string;
  // QR images live per-payment-method (payment_methods.qr_image_url) since
  // each bank/e-wallet entry can carry its own — this is only the
  // free-form text block, shop-wide.
  paymentInstructionsText: string;
};

// Admin-editable shop configuration (CLAUDE.md: settings are configurable,
// not hardcoded, unless stated otherwise). Backed by the `settings` table —
// see docs/ARCHITECTURE.md § Data Model.
export async function getSettings(): Promise<Settings> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("settings").select("key, value");

  if (error) throw error;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value])) as {
    shipping_fee_centavos: number;
    delivery_cities: string[];
    admin_notification_email: string;
    order_payment_hold_hours: number;
    contact_email: string;
    contact_instagram_url: string;
    contact_instagram_handle: string;
    hero_image_url: string | null;
    hero_focal_x: number;
    hero_focal_y: number;
    homepage_hero_eyebrow: string;
    homepage_hero_headline: string;
    homepage_featured_eyebrow: string;
    homepage_featured_heading: string;
    homepage_studio_heading: string;
    homepage_studio_body: string;
    homepage_studio_image_url: string | null;
    homepage_studio_focal_x: number;
    homepage_studio_focal_y: number;
    homepage_studio_image_alt: string;
    homepage_studio_portrait_url: string | null;
    homepage_studio_quote: string;
    homepage_studio_name: string;
    homepage_studio_role: string;
    payment_instructions_text: string;
  };

  return {
    shippingFeeCentavos: map.shipping_fee_centavos,
    deliveryCities: map.delivery_cities,
    adminNotificationEmail: map.admin_notification_email,
    orderPaymentHoldHours: map.order_payment_hold_hours,
    contactEmail: map.contact_email,
    contactInstagramUrl: map.contact_instagram_url,
    contactInstagramHandle: map.contact_instagram_handle,
    heroImageUrl: map.hero_image_url,
    heroFocalX: map.hero_focal_x,
    heroFocalY: map.hero_focal_y,
    homepageHeroEyebrow: map.homepage_hero_eyebrow,
    homepageHeroHeadline: map.homepage_hero_headline,
    homepageFeaturedEyebrow: map.homepage_featured_eyebrow,
    homepageFeaturedHeading: map.homepage_featured_heading,
    homepageStudioHeading: map.homepage_studio_heading,
    homepageStudioBody: map.homepage_studio_body,
    // Fallbacks mirror the 0022 migration's seeds, so the homepage still
    // renders (exactly as before) if this code ships before the
    // migration has been run. Saving still needs the migration, since
    // updateSettings() only updates existing rows.
    homepageStudioImageUrl: map.homepage_studio_image_url ?? null,
    homepageStudioFocalX: map.homepage_studio_focal_x ?? 50,
    homepageStudioFocalY: map.homepage_studio_focal_y ?? 50,
    homepageStudioImageAlt: map.homepage_studio_image_alt ?? "",
    homepageStudioPortraitUrl: map.homepage_studio_portrait_url ?? null,
    homepageStudioQuote: map.homepage_studio_quote ?? "",
    homepageStudioName: map.homepage_studio_name ?? "",
    homepageStudioRole: map.homepage_studio_role ?? "founder & leatherworker",
    paymentInstructionsText: map.payment_instructions_text,
  };
}

const SETTINGS_KEYS: Record<keyof Settings, string> = {
  shippingFeeCentavos: "shipping_fee_centavos",
  deliveryCities: "delivery_cities",
  adminNotificationEmail: "admin_notification_email",
  orderPaymentHoldHours: "order_payment_hold_hours",
  contactEmail: "contact_email",
  contactInstagramUrl: "contact_instagram_url",
  contactInstagramHandle: "contact_instagram_handle",
  heroImageUrl: "hero_image_url",
  heroFocalX: "hero_focal_x",
  heroFocalY: "hero_focal_y",
  homepageHeroEyebrow: "homepage_hero_eyebrow",
  homepageHeroHeadline: "homepage_hero_headline",
  homepageFeaturedEyebrow: "homepage_featured_eyebrow",
  homepageFeaturedHeading: "homepage_featured_heading",
  homepageStudioHeading: "homepage_studio_heading",
  homepageStudioBody: "homepage_studio_body",
  homepageStudioImageUrl: "homepage_studio_image_url",
  homepageStudioFocalX: "homepage_studio_focal_x",
  homepageStudioFocalY: "homepage_studio_focal_y",
  homepageStudioImageAlt: "homepage_studio_image_alt",
  homepageStudioPortraitUrl: "homepage_studio_portrait_url",
  homepageStudioQuote: "homepage_studio_quote",
  homepageStudioName: "homepage_studio_name",
  homepageStudioRole: "homepage_studio_role",
  paymentInstructionsText: "payment_instructions_text",
};

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  const supabase = getSupabaseServerClient();

  for (const [field, value] of Object.entries(input)) {
    const key = SETTINGS_KEYS[field as keyof Settings];

    // PostgREST writes a JS null into a jsonb column as SQL NULL, which
    // settings.value (NOT NULL) rejects. Clearing a nullable setting
    // (image URLs) goes through set_setting() instead, which stores a
    // JSON null — see supabase/migrations/0023_set_setting_fn.sql.
    if (value === null) {
      const { error } = await supabase.rpc("set_setting", {
        p_key: key,
        p_value: null,
      });
      if (error) throw error;
      continue;
    }

    const { error } = await supabase
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) throw error;
  }
}
