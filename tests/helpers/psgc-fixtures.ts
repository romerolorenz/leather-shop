import { getSupabaseServerClient } from "@/lib/supabase/server";

// Real PSGC codes from the bundled snapshot (supabase/psgc/data/), read
// against the dev database's psgc_* tables. Read-only fixtures: no test
// ever writes to the psgc_* tables.

// Metro Manila: no province.
export const MAKATI_BEL_AIR = {
  regionCode: "1300000000",
  provinceCode: null,
  cityCode: "1380300000", // City of Makati
  barangayCode: "1380300002", // Bel-Air
};

// Outside NCR; Cebu City is a highly urbanized city, filed under its
// geographic province (Cebu).
export const CEBU_CITY_LAHUG = {
  regionCode: "0700000000", // Region VII (Central Visayas)
  provinceCode: "0702200000", // Cebu
  cityCode: "0730600000", // City of Cebu
  barangayCode: "0730600041", // Lahug
};

// Fails a test file's beforeAll with a clear message (same pattern as the
// "Seed data missing" check in tests/orders.test.ts) when migration 0025 or
// the PSGC seed hasn't been run on dev yet.
export async function assertPsgcSeeded(): Promise<void> {
  const { count, error } = await getSupabaseServerClient()
    .from("psgc_barangays")
    .select("code", { count: "exact", head: true })
    .eq("code", CEBU_CITY_LAHUG.barangayCode);
  if (error || !count) {
    throw new Error(
      "PSGC data missing on dev: run supabase/migrations/0025_nationwide_delivery_psgc.sql, then `node --env-file=.env.local supabase/psgc/seed.mjs` (docs/MANUAL_TASKS.md)."
    );
  }
}
