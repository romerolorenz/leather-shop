-- Custom requests (docs/design/custom-requests.md): a shopper can leave an
-- optional free-form note ("navy thread, strap 2 cm longer") on a product
-- the owner has opted in, and the note travels with the order item.
--
--   products.custom_request_enabled  per-product toggle, off by default
--   products.custom_request_label    label above the box; null = the
--                                    default "Special request"
--   products.custom_request_help     helper line under the label; null =
--                                    no helper line. Existing and new rows
--                                    start with the brief's default copy.
--   order_items.custom_request_label snapshot of the label at order time
--   order_items.custom_request_note  the shopper's note (normalised by
--                                    POST /api/orders), null = none
--   settings.custom_request_note     shop-wide expectation line under the
--                                    box ("We'll confirm the details...")
--
-- Character limits (label 40, helper 160, note 300) are layout-driven
-- design constants, not business settings: an explicit exception to
-- CLAUDE.md's "settings are configurable" rule, stated in the brief §6.
-- The same numbers live in src/lib/custom-request.ts; these checks are the
-- backstop for any other writer.
--
-- create_order() is redefined (same signature as 0026) so each item's
-- label and note are written by the same insert, inside the same
-- transaction as the rest of the order. Its grant lockdown (0024/0026) is
-- re-applied below.
--
-- Re-runnable: columns are added if missing, constraints are dropped
-- before they're (re)created, the settings row is inserted only if absent,
-- and the function is create-or-replace.
--
-- Safe to run on prod BEFORE the code that uses it is deployed: it only
-- adds columns (all nullable or defaulted) and a settings row, and the new
-- create_order() treats missing custom_request_* keys as null, so the old
-- code's calls behave exactly as before.

-- ─── products ─────────────────────────────────────────────────────────────

alter table products
  add column if not exists custom_request_enabled boolean not null default false;

alter table products
  add column if not exists custom_request_label text;

-- The default fills existing rows too, so the owner sees the suggested
-- helper copy the first time they open a product. Clearing it in the admin
-- stores null (no helper line).
alter table products
  add column if not exists custom_request_help text
  default 'Thread colour, strap length, a small change — tell us what you''d like.';

alter table products drop constraint if exists products_custom_request_label_length;
alter table products
  add constraint products_custom_request_label_length
  check (custom_request_label is null or char_length(custom_request_label) between 1 and 40);

alter table products drop constraint if exists products_custom_request_help_length;
alter table products
  add constraint products_custom_request_help_length
  check (custom_request_help is null or char_length(custom_request_help) between 1 and 160);

-- ─── order_items ──────────────────────────────────────────────────────────

alter table order_items add column if not exists custom_request_label text;
alter table order_items add column if not exists custom_request_note text;

alter table order_items drop constraint if exists order_items_custom_request_note_length;
alter table order_items
  add constraint order_items_custom_request_note_length
  check (custom_request_note is null or char_length(custom_request_note) between 1 and 300);

-- ─── settings ─────────────────────────────────────────────────────────────

insert into settings (key, value) values
  ('custom_request_note', '"We''ll confirm the details by email before we start, including any change to price or timing."')
on conflict (key) do nothing;

-- ─── create_order: now carries each item's request ────────────────────────
-- Identical to 0026 except the order_items insert, which also writes
-- custom_request_label and custom_request_note from p_items. Both are
-- validated (and the label taken from the product, never the client) by
-- POST /api/orders before this is called.
--
-- p_items: [{ product_id, quantity, unit_price_centavos,
--             custom_request_label (null for none),
--             custom_request_note (null for none),
--             options: [{ option_type_name, option_value }, ...] }, ...]
--
-- Everything else (p_order, locking order, error codes LSSTK/LSPRM, the
-- return value) is as documented in 0026_atomic_orders.sql.

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

  -- Promo first, then products in id order: see 0026 for why.
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
    insert into order_items (
      order_id, product_id, quantity, unit_price_centavos,
      custom_request_label, custom_request_note
    )
    values (
      v_order.id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_centavos')::integer,
      -- A note without a label (or an empty one) never reaches here from
      -- the app; nullif keeps a stray '' from tripping the check.
      nullif(v_item->>'custom_request_label', ''),
      nullif(v_item->>'custom_request_note', '')
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

  -- One decrement per product, in product id order (see 0026).
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
