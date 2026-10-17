-- Order safety (docs/IMPROVEMENTS.md, "Order safety" from the 2026-10-17
-- repo review). Three changes, all additive:
--
--   1. create_order(): places a whole order in ONE transaction (order row,
--      items, item options, stock decrement, promo redemption). Before
--      this, src/lib/orders.ts made each step a separate request and
--      undid earlier steps by hand on failure. A timeout part-way could
--      leave a pending order that never took stock; cancelling it later
--      then added back stock that was never taken, so a handmade item
--      could be oversold.
--   2. cancel_order_and_restore_stock(): the guarded status flip and the
--      stock restore in one transaction. Before, a failure between the two
--      lost the stock for good (a retry saw "already cancelled").
--   3. Customer emails become case-insensitive: stored lowercased (with a
--      trigger, so every writer is covered) and compared with lower(). So
--      "Juan@x.com" can't get past a one-per-customer promo used as
--      "juan@x.com", and My Account finds orders typed with capitals.
--
-- Re-runnable: every function is create-or-replace, triggers are dropped
-- before they're created, the email backfill only touches rows that
-- aren't lowercase yet, and revoke/grant are idempotent. (It was edited
-- in place after review and re-applied on dev; prod runs it once.)
--
-- Safe to run on prod BEFORE the code that uses it is deployed: nothing is
-- dropped or renamed. The old code keeps calling decrement_product_stock,
-- restore_product_stock and redeem_promo_code, which still exist with the
-- same signatures. redeem_promo_code is replaced in place (same
-- signature) to compare emails with lower() and to raise the error code
-- create_order() uses; the old code treats any error from it the same way.
-- The email trigger only lowercases what's stored, which the old code
-- never compares against anything but the shopper's own (Google,
-- lowercase) email or the redeem check above.
--
-- Errors the app tells apart (src/lib/orders.ts), as SQLSTATEs:
--   LSSTK  not enough stock; DETAIL is the product id
--   LSPRM  promo code unavailable (inactive, out of its dates, total cap
--          reached, or already used by this customer)
-- Anything else is an unexpected failure. Every error rolls back the whole
-- function, so nothing is left half-done.
--
-- Needs 0025 (create_order writes its shipping_* code/name columns).

-- ─── 1. emails stored lowercased ──────────────────────────────────────────

create or replace function normalize_customer_email()
returns trigger
language plpgsql
as $$
begin
  new.customer_email := lower(btrim(new.customer_email));
  return new;
end;
$$;

revoke execute on function normalize_customer_email() from public, anon, authenticated;

drop trigger if exists orders_normalize_customer_email on orders;
create trigger orders_normalize_customer_email
  before insert or update of customer_email on orders
  for each row execute function normalize_customer_email();

drop trigger if exists promo_code_redemptions_normalize_customer_email on promo_code_redemptions;
create trigger promo_code_redemptions_normalize_customer_email
  before insert or update of customer_email on promo_code_redemptions
  for each row execute function normalize_customer_email();

-- Existing rows. Only these two tables hold a typed customer email
-- (customer_addresses.user_email is the Google account email).
update orders
   set customer_email = lower(btrim(customer_email))
 where customer_email <> lower(btrim(customer_email));

update promo_code_redemptions
   set customer_email = lower(btrim(customer_email))
 where customer_email <> lower(btrim(customer_email));

-- ─── 2. promo redemption: case-insensitive, distinct error code ───────────
-- Same signature as 0016, so the old code's RPC keeps working. Row-locks
-- the promo code so two checkouts can't both slip past the caps. Also
-- re-checks active and the date window under that lock: the code could be
-- switched off between the shopper's preview and placing the order.

create or replace function redeem_promo_code(
  p_promo_code_id uuid,
  p_customer_email text,
  p_order_id uuid
)
returns void
language plpgsql
as $$
declare
  v_promo promo_codes%rowtype;
  v_email text := lower(btrim(p_customer_email));
  v_redeemed_count integer;
begin
  select * into v_promo
  from promo_codes
  where id = p_promo_code_id
  for update;

  if not found then
    raise exception 'promo_code_not_found: %', p_promo_code_id
      using errcode = 'LSPRM';
  end if;

  if not v_promo.active or now() < v_promo.starts_at or now() > v_promo.expires_at then
    raise exception 'promo_code_inactive: %', p_promo_code_id
      using errcode = 'LSPRM';
  end if;

  if v_promo.limit_one_per_customer and exists (
    select 1 from promo_code_redemptions
    where promo_code_id = p_promo_code_id
      and lower(customer_email) = v_email
  ) then
    raise exception 'promo_code_already_redeemed: customer % already used %', v_email, p_promo_code_id
      using errcode = 'LSPRM';
  end if;

  select count(*) into v_redeemed_count
  from promo_code_redemptions
  where promo_code_id = p_promo_code_id;

  if v_redeemed_count >= v_promo.usage_limit_total then
    raise exception 'promo_code_usage_limit_reached: %', p_promo_code_id
      using errcode = 'LSPRM';
  end if;

  insert into promo_code_redemptions (promo_code_id, customer_email, order_id)
  values (p_promo_code_id, v_email, p_order_id);
end;
$$;

revoke execute on function redeem_promo_code(uuid, text, uuid) from public, anon, authenticated;
grant execute on function redeem_promo_code(uuid, text, uuid) to service_role;

-- ─── 3. create_order: the whole order in one transaction ──────────────────
-- Prices, options and the address are validated (and re-priced from the
-- database) in POST /api/orders before this is called. This function
-- re-checks what can change in between, under row locks: stock and the
-- promo code.
--
-- p_order: {
--   customer_name, customer_email, customer_phone,
--   shipping_street, shipping_address2, shipping_barangay, shipping_city,
--   shipping_province, shipping_region, shipping_postal_code,
--   shipping_region_code, shipping_province_code, shipping_city_code,
--   shipping_barangay_code,
--   subtotal_centavos, shipping_centavos, discount_centavos,
--   total_centavos, promo_code_id (null for none)
-- }
-- p_items: [{ product_id, quantity, unit_price_centavos,
--             options: [{ option_type_name, option_value }, ...] }, ...]
--   Option order is kept as order_item_options.position (0-based).
--
-- Returns { id, created_at, status } of the new order.

create or replace function create_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_order orders%rowtype;
  v_item jsonb;
  v_item_id uuid;
  v_stock record;
  v_promo_code_id uuid := nullif(p_order->>'promo_code_id', '')::uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'create_order: no items';
  end if;

  -- Lock order for every create: promo code first, then products in id
  -- order. The promo has to come first because the order insert below
  -- references it (orders.promo_code_id is a foreign key), which takes a
  -- KEY SHARE lock on the promo row, and redeem_promo_code()'s FOR UPDATE
  -- conflicts with that. Without this, two orders using the same code
  -- would each hold KEY SHARE and wait on the other's FOR UPDATE: a
  -- deadlock. Holding FOR UPDATE from the start makes the second order
  -- wait here instead, and redeem_promo_code() just re-takes a lock this
  -- transaction already holds.
  if v_promo_code_id is not null then
    perform 1 from promo_codes where id = v_promo_code_id for update;
  end if;

  insert into orders (
    customer_name, customer_email, customer_phone,
    shipping_street, shipping_address2, shipping_barangay, shipping_city,
    shipping_province, shipping_region, shipping_postal_code,
    shipping_region_code, shipping_province_code, shipping_city_code,
    shipping_barangay_code,
    subtotal_centavos, shipping_centavos, promo_code_id,
    discount_centavos, total_centavos
  ) values (
    p_order->>'customer_name',
    p_order->>'customer_email',
    p_order->>'customer_phone',
    p_order->>'shipping_street',
    nullif(p_order->>'shipping_address2', ''),
    p_order->>'shipping_barangay',
    p_order->>'shipping_city',
    nullif(p_order->>'shipping_province', ''),
    nullif(p_order->>'shipping_region', ''),
    p_order->>'shipping_postal_code',
    p_order->>'shipping_region_code',
    p_order->>'shipping_province_code',
    p_order->>'shipping_city_code',
    p_order->>'shipping_barangay_code',
    (p_order->>'subtotal_centavos')::integer,
    (p_order->>'shipping_centavos')::integer,
    v_promo_code_id,
    coalesce((p_order->>'discount_centavos')::integer, 0),
    (p_order->>'total_centavos')::integer
  )
  returning * into v_order;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    insert into order_items (order_id, product_id, quantity, unit_price_centavos)
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_centavos')::integer
    )
    returning id into v_item_id;

    insert into order_item_options (order_item_id, option_type_name, option_value, position)
    select v_item_id,
           opt.value->>'option_type_name',
           opt.value->>'option_value',
           (opt.ordinality - 1)::integer
    from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb))
           with ordinality as opt(value, ordinality);
  end loop;

  -- One decrement per product (a cart can hold the same product twice
  -- with different options), in product id order so two orders sharing
  -- products always lock them in the same order and can't deadlock. (The
  -- order_items inserts above only take KEY SHARE on products, which
  -- doesn't conflict with these updates or with a cancel's locks.) The
  -- WHERE re-checks stock under the row lock: of two orders racing for
  -- the last unit, the second waits, then finds too little and fails.
  for v_stock in
    select (value->>'product_id')::uuid as product_id,
           sum((value->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items)
    group by 1
    order by 1
  loop
    update products
       set stock_quantity = stock_quantity - v_stock.quantity
     where id = v_stock.product_id
       and stock_quantity >= v_stock.quantity;

    if not found then
      raise exception 'insufficient_stock: product % does not have % units available', v_stock.product_id, v_stock.quantity
        using errcode = 'LSSTK', detail = v_stock.product_id::text;
    end if;
  end loop;

  -- Re-checks the caps under the promo lock taken at the top.
  if v_promo_code_id is not null then
    perform redeem_promo_code(v_promo_code_id, v_order.customer_email, v_order.id);
  end if;

  return jsonb_build_object(
    'id', v_order.id,
    'created_at', v_order.created_at,
    'status', v_order.status
  );
end;
$$;

revoke execute on function create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function create_order(jsonb, jsonb) to service_role;

-- ─── 4. cancel_order_and_restore_stock: flip + restore in one step ────────
-- Used by the admin cancel and the daily expiry sweep. Only an order still
-- awaiting payment (pending_payment or payment_details_sent) is cancelled;
-- returns false for anything else (paid, shipped, already cancelled,
-- missing), without touching stock. The status UPDATE row-locks the order,
-- so two cancels at once (or a cancel racing "mark paid") can't both win:
-- the second waits, re-checks the status, and finds it changed.

create or replace function cancel_order_and_restore_stock(p_order_id uuid)
returns boolean
language plpgsql
as $$
begin
  update orders
     set status = 'cancelled',
         status_updated_at = now()
   where id = p_order_id
     and status in ('pending_payment', 'payment_details_sent');

  if not found then
    return false;
  end if;

  -- Lock the order's products in id order first, the same order
  -- create_order() locks them in, so a cancel racing an order (or another
  -- cancel) on the same products can't deadlock. FOR NO KEY UPDATE is the
  -- lock the UPDATE below takes anyway; unlike FOR UPDATE it doesn't wait
  -- on the FOR KEY SHARE locks create_order's order_items inserts take.
  perform 1
     from products
    where id in (select product_id from order_items where order_id = p_order_id)
    order by id
    for no key update;

  update products p
     set stock_quantity = p.stock_quantity + s.quantity
    from (
      select product_id, sum(quantity) as quantity
      from order_items
      where order_id = p_order_id
      group by product_id
    ) s
   where p.id = s.product_id;

  return true;
end;
$$;

revoke execute on function cancel_order_and_restore_stock(uuid) from public, anon, authenticated;
grant execute on function cancel_order_and_restore_stock(uuid) to service_role;

-- decrement_product_stock is no longer called by the app once this
-- release is deployed (create_order does its own decrement). It's kept
-- here so the old code keeps working between this migration and the
-- deploy; dropping it is logged in docs/IMPROVEMENTS.md.
-- restore_product_stock stays in use (tests/helpers/cleanup.ts).
