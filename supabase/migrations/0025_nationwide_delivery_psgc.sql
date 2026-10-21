-- Nationwide delivery with PSGC address dropdowns (docs/IMPROVEMENTS.md,
-- "Deliver nationwide (whole Philippines), with PSGC address dropdowns",
-- decided 2026-10-15). See docs/ARCHITECTURE.md § Data Model.
--
-- 1. Four reference tables holding the PSA's Philippine Standard
--    Geographic Code (region -> province -> city/municipality -> barangay).
--    This migration only creates them. The rows come from the bundled
--    snapshot via `node --env-file=.env.local supabase/psgc/seed.mjs`
--    (supabase/psgc/README.md), so a PSA refresh never needs a new
--    migration.
-- 2. PSGC code columns + snapshotted names on customer_addresses and
--    orders. Names are snapshotted (not joined from psgc_* at read time) so
--    past orders, emails and admin views never change when the PSGC data is
--    refreshed — same reasoning as order_items.unit_price_centavos. The
--    existing city/barangay text columns stay as the display snapshot.
--
-- Purely additive, so it's safe to run on prod before the code that uses
-- it is deployed. settings.delivery_cities is deliberately NOT deleted
-- here, even though the app no longer reads it (delivery is always
-- nationwide now): the code before this release still reads that row at
-- checkout and would break between this migration and the deploy, and
-- `supabase db push` applies every pending migration at once. Delete it in
-- the next migration after this release is live (docs/IMPROVEMENTS.md).

-- ─── PSGC reference tables ────────────────────────────────────────────────
-- Codes are the PSA's 10-digit PSGC, kept as text (leading zeros matter).

create table psgc_regions (
  code text primary key,
  name text not null,
  sort_order integer not null -- PSA's own order (NCR, CAR, I, II, ...)
);

-- Real provinces, plus two province-level groupings PSA lists that aren't
-- provinces: "City of Isabela" (Region IX) and BARMM's "Special Geographic
-- Area". NCR has no rows here (its cities have province_code null).
create table psgc_provinces (
  code text primary key,
  region_code text not null references psgc_regions(code),
  name text not null
);

create index psgc_provinces_region_code_idx on psgc_provinces(region_code);

-- Cities and municipalities. province_code is the *geographic* province:
-- highly urbanized cities (Cebu City, Davao City, ...) are filed under the
-- province they sit in, even though PSA codes them as independent of it,
-- so customers find them where they expect (supabase/psgc/derive.mjs).
-- Null only for NCR, which has no provinces.
create table psgc_cities (
  code text primary key,
  region_code text not null references psgc_regions(code),
  province_code text references psgc_provinces(code),
  name text not null,
  kind text not null check (kind in ('city', 'municipality')),
  city_class text -- PSA's HUC / ICC / CC; null for municipalities
);

create index psgc_cities_region_province_idx on psgc_cities(region_code, province_code);

-- ~42k rows. sub_municipality is only set for the City of Manila, whose
-- barangays PSA groups under Tondo, Sampaloc, etc.
create table psgc_barangays (
  code text primary key,
  city_code text not null references psgc_cities(code),
  name text not null,
  sub_municipality text
);

create index psgc_barangays_city_code_idx on psgc_barangays(city_code);

-- Same default-deny pattern as every other table: the server reads these
-- with the service-role key (src/lib/psgc.ts) and the browser only sees
-- them through /api/locations/*.
alter table psgc_regions enable row level security;
alter table psgc_provinces enable row level security;
alter table psgc_cities enable row level security;
alter table psgc_barangays enable row level security;

-- ─── address + order snapshot columns ─────────────────────────────────────
-- Nullable: required-ness is enforced in app code (src/lib/psgc.ts
-- validates the full code chain on every address save and order), and
-- existing rows predate PSGC. No foreign keys to psgc_*, on purpose: a
-- PSA refresh that retires a code must not be blocked by (or cascade into)
-- old orders. A saved address whose codes are missing or no longer valid
-- is shown as "needs updating" and re-picked at checkout.

alter table customer_addresses
  add column region_code text,
  add column province_code text,
  add column city_code text,
  add column barangay_code text,
  add column region text,
  add column province text;

alter table orders
  add column shipping_region_code text,
  add column shipping_province_code text,
  add column shipping_city_code text,
  add column shipping_barangay_code text,
  add column shipping_region text,
  add column shipping_province text;
