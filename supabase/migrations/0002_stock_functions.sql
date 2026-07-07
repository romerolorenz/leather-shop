-- Atomic stock adjustment functions — see ARCHITECTURE.md § Data Model
-- and PRD §5 (stock decrements at order placement, prevent overselling).
--
-- Doing this as a single UPDATE inside a function (rather than a
-- read-then-write from the app) makes the decrement safe under concurrent
-- requests: the WHERE clause's stock_quantity >= p_quantity check and the
-- UPDATE happen atomically in one statement, so two simultaneous orders for
-- the last unit can't both succeed.

create or replace function decrement_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
returns void
language plpgsql
as $$
begin
  update product_variants
  set stock_quantity = stock_quantity - p_quantity
  where id = p_variant_id and stock_quantity >= p_quantity;

  if not found then
    raise exception 'insufficient_stock: variant % does not have % units available', p_variant_id, p_quantity
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function restore_variant_stock(
  p_variant_id uuid,
  p_quantity integer
)
returns void
language plpgsql
as $$
begin
  update product_variants
  set stock_quantity = stock_quantity + p_quantity
  where id = p_variant_id;
end;
$$;
