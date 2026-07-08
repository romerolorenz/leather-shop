-- Generalizes product_variants.label (a single flat dimension, e.g. "Black")
-- into admin-defined option types (Color, Thread Color, Size, ...), each
-- with its own ordered list of admin-entered values — a variant becomes a
-- combination of one value per option type. Closes a real gap against
-- docs/PRODUCT_REQUIREMENTS.md §3/§5 and US-3 ("select a color, size, and
-- thread color from fixed dropdown/swatch options"), which only ever got
-- the single flat dimension built. See docs/IMPROVEMENTS.md.

create table product_option_types (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,              -- "Color", "Thread Color", "Size"
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, name)
);

create table product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_type_id uuid not null references product_option_types(id) on delete cascade,
  value text not null,             -- "Black", "Natural Thread"
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (option_type_id, value)
);

create table product_variant_options (
  variant_id uuid not null references product_variants(id) on delete cascade,
  option_value_id uuid not null references product_option_values(id) on delete cascade,
  primary key (variant_id, option_value_id)
);

alter table product_option_types enable row level security;
alter table product_option_values enable row level security;
alter table product_variant_options enable row level security;

-- Snapshot the variant's display label onto each order item at order time —
-- same reasoning as the existing unit_price_centavos snapshot: a later
-- rename/deletion of an option value shouldn't rewrite historical order
-- display. Backfill existing rows from the (still-present) live label
-- before it's dropped below.
alter table order_items add column variant_label text;

update order_items oi
set variant_label = pv.label
from product_variants pv
where pv.id = oi.variant_id;

alter table order_items alter column variant_label set not null;

-- Migrate existing data: today's only dimension is color, so every
-- existing product_variants row becomes a single "Color" option type +
-- one value + one variant/value link. unique(product_id, label) already
-- guarantees one product_variants row per (product, label) — no dedup
-- needed. Existing variant ids are preserved (never recreated), since
-- order_items already references them by FK.
with new_types as (
  insert into product_option_types (product_id, name, position)
  select distinct product_id, 'Color', 0 from product_variants
  returning id, product_id
)
insert into product_option_values (option_type_id, value, position)
select nt.id, v.label,
       row_number() over (partition by nt.id order by v.created_at) - 1
from product_variants v
join new_types nt on nt.product_id = v.product_id;

insert into product_variant_options (variant_id, option_value_id)
select v.id, pov.id
from product_variants v
join product_option_types pot on pot.product_id = v.product_id
join product_option_values pov
  on pov.option_type_id = pot.id and pov.value = v.label;

-- product_variants keeps only id/product_id/stock_quantity/in_stock —
-- label is now fully derived via product_variant_options for live
-- products, and snapshotted onto order_items.variant_label for orders.
alter table product_variants drop column label cascade;
