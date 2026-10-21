-- Shop order (docs/design/shop-order.md): the admin arranges which
-- category comes first on /products and the order of products inside each
-- category, by dragging on /admin/categories.
--
--   categories.position  shop-wide order of the category sections
--   products.position    order of a product within its category
--
-- Lower comes first. Positions don't have to be dense: a product leaving a
-- category leaves a gap, which only affects sorting ties (broken by
-- created_at, see src/lib/products.ts). The next drag-reorder on
-- /admin/categories rewrites the whole list densely anyway.
--
-- Backfill keeps today's look as close as possible: categories
-- alphabetical by name, products by created_at within each category (the
-- old flat grid was oldest-first).
--
-- "New goes last" is done with triggers, so every writer gets it (the
-- admin forms, the seed scripts, tests inserting rows directly):
--   - a new category goes after the last one;
--   - a new product goes to the end of its category;
--   - changing a product's category moves it to the end of the new one.
-- Two inserts at the same instant can tie on a position; harmless (the
-- created_at tie-break decides) for a one-person admin.
--
-- Re-runnable: columns are added if missing, the backfill only fills rows
-- that have no position yet, triggers are dropped before they're created,
-- and revoke is idempotent.
--
-- Safe to run on prod BEFORE the code that uses it is deployed: it only
-- adds columns (filled by the triggers on insert, so the old code's
-- inserts still satisfy NOT NULL) and triggers; nothing is dropped or
-- renamed.

-- ─── columns + backfill ──────────────────────────────────────────────────

alter table categories add column if not exists position integer;
alter table products add column if not exists position integer;

update categories
set position = ranked.rn
from (
  select id, row_number() over (order by name, id) - 1 as rn
  from categories
) ranked
where categories.id = ranked.id
  and categories.position is null;

update products
set position = ranked.rn
from (
  select id,
         row_number() over (partition by category_id order by created_at, id) - 1 as rn
  from products
) ranked
where products.id = ranked.id
  and products.position is null;

alter table categories alter column position set not null;
alter table products alter column position set not null;

-- ─── new rows go last ────────────────────────────────────────────────────

create or replace function categories_position_last()
returns trigger
language plpgsql
as $$
begin
  if new.position is null then
    select coalesce(max(position) + 1, 0) into new.position from categories;
  end if;
  return new;
end;
$$;

revoke execute on function categories_position_last() from public, anon, authenticated;

drop trigger if exists categories_position_last on categories;
create trigger categories_position_last
  before insert on categories
  for each row execute function categories_position_last();

-- On insert, an explicit position is kept (nothing in the app sends one).
-- On a category change, the product always goes to the end of the new
-- category, whatever position the update carried.
create or replace function products_position_last()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' and new.position is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.category_id is not distinct from old.category_id then
    return new;
  end if;
  select coalesce(max(position) + 1, 0) into new.position
  from products
  where category_id = new.category_id
    and id <> new.id;
  return new;
end;
$$;

revoke execute on function products_position_last() from public, anon, authenticated;

drop trigger if exists products_position_last on products;
create trigger products_position_last
  before insert or update of category_id on products
  for each row execute function products_position_last();
