import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Settings = {
  shippingFeeCentavos: number;
  deliveryCities: string[];
  adminNotificationEmail: string;
  orderPaymentHoldHours: number;
};

// Admin-editable shop configuration (CLAUDE.md: settings are configurable,
// not hardcoded, unless stated otherwise). Backed by the `settings` table —
// see ARCHITECTURE.md § Data Model.
export async function getSettings(): Promise<Settings> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("settings").select("key, value");

  if (error) throw error;

  const map = Object.fromEntries(data.map((row) => [row.key, row.value])) as {
    shipping_fee_centavos: number;
    delivery_cities: string[];
    admin_notification_email: string;
    order_payment_hold_hours: number;
  };

  return {
    shippingFeeCentavos: map.shipping_fee_centavos,
    deliveryCities: map.delivery_cities,
    adminNotificationEmail: map.admin_notification_email,
    orderPaymentHoldHours: map.order_payment_hold_hours,
  };
}

const SETTINGS_KEYS: Record<keyof Settings, string> = {
  shippingFeeCentavos: "shipping_fee_centavos",
  deliveryCities: "delivery_cities",
  adminNotificationEmail: "admin_notification_email",
  orderPaymentHoldHours: "order_payment_hold_hours",
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
