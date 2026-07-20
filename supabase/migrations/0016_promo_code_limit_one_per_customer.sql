-- Lets an admin opt a promo code out of the one-redemption-per-customer
-- rule (e.g. a code shared publicly that anyone can use more than once) —
-- feedback from manual testing on docs/MANUAL_TESTING.md's promo-code
-- checklist. Defaults to true so every existing code keeps its current
-- behavior unchanged. The total usage cap (usage_limit_total) still
-- applies regardless of this flag.

alter table promo_codes
  add column limit_one_per_customer boolean not null default true;

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
  v_limit_one_per_customer boolean;
  v_redeemed_count integer;
  v_already_redeemed boolean;
begin
  select usage_limit_total, limit_one_per_customer
    into v_usage_limit_total, v_limit_one_per_customer
  from promo_codes
  where id = p_promo_code_id
  for update;

  if not found then
    raise exception 'promo_code_not_found: %', p_promo_code_id
      using errcode = 'P0001';
  end if;

  if v_limit_one_per_customer then
    select exists (
      select 1 from promo_code_redemptions
      where promo_code_id = p_promo_code_id and customer_email = p_customer_email
    ) into v_already_redeemed;

    if v_already_redeemed then
      raise exception 'promo_code_already_redeemed: customer % already used %', p_customer_email, p_promo_code_id
        using errcode = 'P0001';
    end if;
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
