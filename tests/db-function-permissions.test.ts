import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// The public anon key ships to the browser (NEXT_PUBLIC_SUPABASE_ANON_KEY),
// so anything it can reach through PostgREST is reachable by anyone. This
// file pins down what it must NOT reach:
//   1. Database functions (RPCs) — only the server's service-role key may
//      execute them. See supabase/migrations/0023_set_setting_fn.sql and
//      0024_lock_down_function_grants.sql.
//   2. Tables — every app table is RLS default-deny (no policies), so anon
//      reads come back empty. See supabase/migrations/0001_init.sql.
//
// Safe against the real dev project: every RPC call uses arguments that are
// no-ops even if the call were permitted (random non-existent ids, quantity
// 0, a non-existent setting key) — each function either matches zero rows
// or raises before writing. Table checks are read-only.

const PERMISSION_DENIED = "42501";

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.example."
    );
  }
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

describe("database functions are not executable with the anon key", () => {
  const anon = anonClient();

  it.each([
    [
      "decrement_product_stock",
      { p_product_id: randomUUID(), p_quantity: 0 },
    ],
    [
      "restore_product_stock",
      { p_product_id: randomUUID(), p_quantity: 0 },
    ],
    [
      "redeem_promo_code",
      {
        p_promo_code_id: randomUUID(),
        p_customer_email: "anon-permission-test@example.invalid",
        p_order_id: randomUUID(),
      },
    ],
    [
      "set_setting",
      { p_key: "__anon_permission_test_nonexistent__", p_value: null },
    ],
  ])("%s → permission denied", async (fn, args) => {
    const { error } = await anon.rpc(fn, args);
    expect(error, `${fn} should be rejected for anon`).not.toBeNull();
    expect(error?.code, error?.message).toBe(PERMISSION_DENIED);
  });

  // Dropped in 0010_product_level_stock.sql (stock moved to products).
  // They must stay gone — "not found" (PGRST202) or denied are both fine.
  it.each(["decrement_variant_stock", "restore_variant_stock"])(
    "%s no longer exists",
    async (fn) => {
      const { error } = await anon.rpc(fn, {
        p_variant_id: randomUUID(),
        p_quantity: 0,
      });
      expect(error, `${fn} should not be callable`).not.toBeNull();
      expect(["PGRST202", PERMISSION_DENIED]).toContain(error?.code);
    }
  );
});

describe("app tables return nothing to the anon key (RLS default-deny)", () => {
  const anon = anonClient();

  it.each([
    "admin_users",
    "categories",
    "customer_addresses",
    "faq_items",
    "option_types",
    "option_values",
    "order_item_options",
    "order_items",
    "orders",
    "payment_methods",
    "product_option_selections",
    "product_options",
    "product_photos",
    "products",
    "promo_code_categories",
    "promo_code_redemptions",
    "promo_codes",
    "settings",
  ])("%s", async (table) => {
    const { data, error } = await anon.from(table).select("*").limit(1);
    // Either RLS hides every row (empty result) or the role has no table
    // privilege at all (error) — both mean nothing leaks.
    if (!error) expect(data).toEqual([]);
  });
});
