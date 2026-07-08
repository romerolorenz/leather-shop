-- Course correction — see the "Course correction" section at the top of
-- docs/PRODUCT_OPTIONS_DESIGN.md. All v1 products are made-to-order; stock
-- is one capacity number per product, not per option/variant combination.
-- Migration 0009 shipped per-variant stock before this was clarified —
-- this moves it to products instead. Run after 0009 (already live).

-- ─── stock moves from product_variants to products ────────────────────────

alter table products
  add column stock_quantity integer not null default 0 check (stock_quantity >= 0),
  add column in_stock boolean generated always as (stock_quantity > 0) stored;

-- Sum each product's existing per-variant capacity into one product-level
-- number, so no capacity already set by the admin is lost in the switch.
update products p
set stock_quantity = sub.total
from (
  select product_id, sum(stock_quantity) as total
  from product_variants
  group by product_id
) sub
where sub.product_id = p.id;

alter table product_variants
  drop column stock_quantity,
  drop column in_stock;

-- ─── stock functions, keyed on product_id instead of variant_id ───────────
-- 0002's functions can't be edited in place (already ran against the live
-- DB) — dropped and replaced here instead, per the project's
-- never-amend-an-applied-migration rule.

drop function if exists decrement_variant_stock(uuid, integer);
drop function if exists restore_variant_stock(uuid, integer);

create or replace function decrement_product_stock(
  p_product_id uuid,
  p_quantity integer
)
returns void
language plpgsql
as $$
begin
  update products
  set stock_quantity = stock_quantity - p_quantity
  where id = p_product_id and stock_quantity >= p_quantity;

  if not found then
    raise exception 'insufficient_stock: product % does not have % units of capacity available', p_product_id, p_quantity
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function restore_product_stock(
  p_product_id uuid,
  p_quantity integer
)
returns void
language plpgsql
as $$
begin
  update products
  set stock_quantity = stock_quantity + p_quantity
  where id = p_product_id;
end;
$$;

-- ─── admin-configurable option display style (buttons vs dropdown) ────────
-- New scope, not a correction — see docs/PRODUCT_OPTIONS_DESIGN.md's "New
-- scope: admin-configurable option display style" section.

alter table product_option_types
  add column display_style text not null default 'buttons'
    check (display_style in ('buttons', 'dropdown'));
