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
  paymentInstructionsText: "payment_instructions_text",
};

export async function updateSettings(input: Partial<Settings>): Promise<void> {
  const supabase = getSupabaseServerClient();

  for (const [field, value] of Object.entries(input)) {
    const key = SETTINGS_KEYS[field as keyof Settings];
    const { error } = await supabase
      .from("settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key);

    if (error) throw error;
  }
}
