#!/usr/bin/env node
// Loads the bundled PSGC snapshot (supabase/psgc/data/) into the psgc_*
// tables from migration 0025. Safe to re-run: it upserts every row and then
// deletes rows that are no longer in the snapshot (a PSA refresh can
// retire codes). See supabase/psgc/README.md.
//
//   Dev:   node --env-file=.env.local supabase/psgc/seed.mjs
//   Prod:  SUPABASE_URL=https://<prod-ref>.supabase.co \
//          SUPABASE_SERVICE_ROLE_KEY=<prod service_role key> \
//          node supabase/psgc/seed.mjs

import { createClient } from "@supabase/supabase-js";
import { readSnapshot } from "./snapshot-io.mjs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see supabase/psgc/README.md).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const snapshot = readSnapshot();
const BATCH = 1000;

console.log(`Target: ${new URL(url).host}`);
console.log(`Snapshot: ${snapshot.meta.sourceFile} (published ${snapshot.meta.publicationDate})`);

const toRows = {
  psgc_regions: snapshot.regions.map((r) => ({
    code: r.code,
    name: r.name,
    sort_order: r.sortOrder,
  })),
  psgc_provinces: snapshot.provinces.map((p) => ({
    code: p.code,
    region_code: p.regionCode,
    name: p.name,
  })),
  psgc_cities: snapshot.cities.map((c) => ({
    code: c.code,
    region_code: c.regionCode,
    province_code: c.provinceCode,
    name: c.name,
    kind: c.kind,
    city_class: c.cityClass,
  })),
  psgc_barangays: snapshot.barangays.map((b) => ({
    code: b.code,
    city_code: b.cityCode,
    name: b.name,
    sub_municipality: b.subMunicipality,
  })),
};

async function fail(step, error) {
  console.error(`Failed while ${step}:`, error.message ?? error);
  if (/relation .* does not exist|schema cache/i.test(error.message ?? "")) {
    console.error("Has migration 0025_nationwide_delivery_psgc.sql been run on this database?");
  }
  process.exit(1);
}

async function allCodes(table) {
  const codes = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await supabase
      .from(table)
      .select("code")
      .order("code")
      .range(from, from + BATCH - 1);
    if (error) await fail(`reading ${table}`, error);
    codes.push(...data.map((r) => r.code));
    if (data.length < BATCH) return codes;
  }
}

// Parents before children for the upserts (foreign keys)...
for (const [table, rows] of Object.entries(toRows)) {
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase
      .from(table)
      .upsert(rows.slice(i, i + BATCH), { onConflict: "code" });
    if (error) await fail(`upserting ${table}`, error);
  }
  console.log(`Upserted ${rows.length} ${table}`);
}

// ...children before parents for removing codes PSA has retired.
for (const table of Object.keys(toRows).reverse()) {
  const keep = new Set(toRows[table].map((r) => r.code));
  const stale = (await allCodes(table)).filter((code) => !keep.has(code));
  for (let i = 0; i < stale.length; i += 200) {
    const { error } = await supabase.from(table).delete().in("code", stale.slice(i, i + 200));
    if (error) await fail(`removing retired ${table}`, error);
  }
  if (stale.length) console.log(`Removed ${stale.length} retired ${table}`);
}

console.log("Done.");
