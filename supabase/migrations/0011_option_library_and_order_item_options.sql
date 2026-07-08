-- Checkpoints 8 + 9 of docs/PRODUCT_OPTIONS_DESIGN.md, combined per its
-- "Combined migration plan" (both read through the same soon-to-be-dropped
-- product_variant_options -> product_option_values -> product_option_types
-- chain, so doing them in one file avoids two migrations doing that read):
--
--   8. Drop the variant entity entirely. Any combination of a product's own
--      option values is orderable — no admin-created product_variants row
--      gates which combinations are allowed. Selected options are recorded
--      directly on the order (order_item_options, snapshotted text) instead
--      of resolved through a variant_id.
--   9. Make option types/values shop-wide and reusable. Define "Color: Blue,
--      Red, Green" once (option_types/option_values) and attach it to any
--      product (product_options), picking which subset of values that
--      product actually offers (product_option_selections).
--
-- See docs/IMPROVEMENTS.md.

-- ─── new tables ─────────────────────────────────────────────────────────

create table option_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_style text not null default 'buttons'
    check (display_style in ('buttons', 'dropdown')),
  created_at timestamptz not null default now()
);

create table option_values (
  id uuid primary key default gen_random_uuid(),
  option_type_id uuid not null references option_types(id) on delete cascade,
  value text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (option_type_id, value)
);

-- Which option types a given product uses, and in what order.
create table product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  option_type_id uuid not null references option_types(id) on delete cascade,
  position integer not null default 0,
  unique (product_id, option_type_id)
);

-- The per-product subset of that type's values this product actually
-- offers. No DB constraint enforces that option_value_id belongs to the
-- same option_type_id as its product_options row — checked in app code,
-- same posture as the old "no duplicate variant combination" check that
-- used to live in src/lib/admin/catalog.ts.
create table product_option_selections (
  product_option_id uuid not null references product_options(id) on delete cascade,
  option_value_id uuid not null references option_values(id) on delete cascade,
  primary key (product_option_id, option_value_id)
);

-- Selected options recorded directly on the order, snapshotted as plain
-- text at order time — same reasoning as unit_price_centavos: a later
-- rename/delete of an option type or value shouldn't rewrite historical
-- order display. Not FKs to option_types/option_values, deliberately, so
-- deleting a shared option later can't be blocked by, or corrupt, past
-- orders.
create table order_item_options (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  option_type_name text not null,
  option_value text not null,
  position integer not null default 0
);

create index order_item_options_order_item_id_idx on order_item_options(order_item_id);

alter table option_types enable row level security;
alter table option_values enable row level security;
alter table product_options enable row level security;
alter table product_option_selections enable row level security;
alter table order_item_options enable row level security;

-- ─── backfill order_item_options from existing variant assignments ───────
-- Read through the still-live order_items.variant_id -> product_variants ->
-- product_variant_options -> product_option_values -> product_option_types
-- chain before any of it is dropped below.

insert into order_item_options (order_item_id, option_type_name, option_value, position)
select oi.id, pot.name, pov.value, pot.position
from order_items oi
join product_variant_options pvo on pvo.variant_id = oi.variant_id
join product_option_values pov on pov.id = pvo.option_value_id
join product_option_types pot on pot.id = pov.option_type_id
order by oi.id, pot.position;

-- ─── backfill the shop-wide option library from per-product types/values ─
-- Today's design (migration 0009) gave every product its own "Color"/
-- "Size"/... row — merge same-named product_option_types rows (exact text
-- match) into one option_types row per distinct name, union their values
-- (dedup by exact text, order preserved via min(position)), then recreate
-- each product's original type attachment and value subset against the
-- merged rows.

with merged_types as (
  insert into option_types (name, display_style)
  select
    pot.name,
    -- Majority display_style per name (possible to differ across products
    -- after migration 0010 made it per-product); ties broken by min(id)
    -- for determinism. Flagged in MANUAL_TASKS.md as a post-migration
    -- "verify option display styles still look right" check.
    (
      select pot2.display_style
      from product_option_types pot2
      where pot2.name = pot.name
      group by pot2.display_style
      order by count(*) desc, min(pot2.id)
      limit 1
    )
  from product_option_types pot
  group by pot.name
  returning id, name
),
merged_values as (
  insert into option_values (option_type_id, value, position)
  select mt.id, v.value, min(v.position)
  from product_option_values v
  join product_option_types pot on pot.id = v.option_type_id
  join merged_types mt on mt.name = pot.name
  group by mt.id, v.value
  returning id, option_type_id, value
),
new_product_options as (
  insert into product_options (product_id, option_type_id, position)
  select pot.product_id, mt.id, pot.position
  from product_option_types pot
  join merged_types mt on mt.name = pot.name
  returning id, product_id, option_type_id
)
insert into product_option_selections (product_option_id, option_value_id)
select npo.id, mv.id
from product_option_types pot
join product_option_values pov on pov.option_type_id = pot.id
join merged_types mt on mt.name = pot.name
join new_product_options npo
  on npo.product_id = pot.product_id and npo.option_type_id = mt.id
join merged_values mv on mv.option_type_id = mt.id and mv.value = pov.value;

-- ─── drop what's now superseded ───────────────────────────────────────────
-- order_items.variant_id must go before product_variants (it's the FK
-- holder); product_variant_options before product_variants and
-- product_option_values (it references both); product_option_values before
-- product_option_types.

alter table order_items
  drop column variant_id,
  drop column variant_label;

drop table product_variant_options;
drop table product_variants;
drop table product_option_values;
drop table product_option_types;
