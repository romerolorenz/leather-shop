-- Promo codes (see docs/IMPROVEMENTS.md's "Promo code capability").
-- Percentage-off discount with an admin-set cap, optional category
-- restriction (no rows in promo_code_categories = applies to the whole
-- order; restricted codes discount only the eligible items' subtotal, not
-- the whole cart — see IMPROVEMENTS.md), and three enforced usage limits:
-- once per customer (by email), a total redemption cap, and a
-- start/end date range. One code per order — no stacking.

create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null
    check (discount_percent > 0 and discount_percent <= 100),
  max_discount_centavos integer not null check (max_discount_centavos >= 0),
  min_order_value_centavos integer not null default 0
    check (min_order_value_centavos >= 0),
  usage_limit_total integer not null check (usage_limit_total > 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);

create table promo_code_categories (
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  primary key (promo_code_id, category_id)
);

-- One row per successful redemption (not just a counter) so the
-- per-customer and total-cap rules are checked against real history, not
-- a number that could drift if a code is edited later.
create table promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references promo_codes(id),
  customer_email text not null,
  order_id uuid not null references orders(id),
  redeemed_at timestamptz not null default now()
);

create index promo_code_redemptions_promo_code_id_idx
  on promo_code_redemptions(promo_code_id);
create index promo_code_redemptions_customer_email_idx
  on promo_code_redemptions(customer_email);

-- Nullable: most orders have no code. discount_centavos is snapshotted at
-- order time (same reasoning as unit_price_centavos) so a later edit/
-- deactivation of the code doesn't rewrite a past order's displayed total.
alter table orders add column promo_code_id uuid references promo_codes(id);
alter table orders add column discount_centavos integer not null default 0
  check (discount_centavos >= 0);

-- Atomic redeem: locks the promo code row so two concurrent checkouts
-- using the same code can't both slip past the total-usage-cap check —
-- same "single statement, WHERE-guarded" idea as decrement_product_stock
-- in 0002_stock_functions.sql, adapted to a check-then-insert via an
-- explicit row lock (the check itself isn't a single UPDATE here).
create or replace function redeem_promo_code(
  p_promo_code_id uuid,
  p_customer_email text,
  p_order_id uuid
)
returns void
language plpgsql
as $$
declare
  v_usage_limit_total integer;
  v_redeemed_count integer;
  v_already_redeemed boolean;
begin
  select usage_limit_total into v_usage_limit_total
  from promo_codes
  where id = p_promo_code_id
  for update;

  if not found then
    raise exception 'promo_code_not_found: %', p_promo_code_id
      using errcode = 'P0001';
  end if;

  select exists (
    select 1 from promo_code_redemptions
    where promo_code_id = p_promo_code_id and customer_email = p_customer_email
  ) into v_already_redeemed;

  if v_already_redeemed then
    raise exception 'promo_code_already_redeemed: customer % already used %', p_customer_email, p_promo_code_id
      using errcode = 'P0001';
  end if;

  select count(*) into v_redeemed_count
  from promo_code_redemptions
  where promo_code_id = p_promo_code_id;

  if v_redeemed_count >= v_usage_limit_total then
    raise exception 'promo_code_usage_limit_reached: %', p_promo_code_id
      using errcode = 'P0001';
  end if;

  insert into promo_code_redemptions (promo_code_id, customer_email, order_id)
  values (p_promo_code_id, p_customer_email, p_order_id);
end;
$$;

alter table promo_codes enable row level security;
alter table promo_code_categories enable row level security;
alter table promo_code_redemptions enable row level security;
