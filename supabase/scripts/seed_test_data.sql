-- Seeds product/options/order test data — built to exercise the
-- "Product options: shop-wide library, no variant entity" checklist in
-- docs/MANUAL_TESTING.md. Run wipe_test_data.sql first for a clean slate
-- (this script doesn't delete anything itself, so re-running it on top of
-- existing data just adds more products/options).
--
-- Assumes migration 0011_option_library_and_order_item_options.sql has
-- run.
--
-- Creates:
--   - A shared "Color" type (buttons; Chestnut Brown/Black/Tan), a shared
--     "Thread Color" type (dropdown; Natural/Contrast Black), and a shared
--     "Size" type (buttons; Small/Medium/Large).
--   - Heritage Messenger Bag — Color (all 3 values) + Thread Color, in
--     stock, ordering enabled.
--   - Card Wallet — the *same* shared Color type as the messenger bag, but
--     only 2 of its 3 values selected: demonstrates independent
--     per-product value subsets (US-40).
--   - Weekender Duffel — Color (all) + Size, stock 0: every option
--     combination should show uniformly "Sold out".
--   - Minimalist Cardholder — no options attached at all: exercises the
--     zero-option-types PDP/cart/checkout path.
--   - Limited Tote — Color (Tan only), ordering paused.

do $$
declare
  color_type_id uuid;
  brown_id uuid;
  black_id uuid;
  tan_id uuid;

  thread_type_id uuid;
  natural_id uuid;
  contrast_id uuid;

  size_type_id uuid;
  size_s_id uuid;
  size_m_id uuid;
  size_l_id uuid;

  messenger_id uuid;
  card_wallet_id uuid;
  duffel_id uuid;
  minimalist_id uuid;
  limited_tote_id uuid;

  po_id uuid; -- scratch: the product_options row currently being populated
begin
  -- ─── shop-wide option library ──────────────────────────────────────────

  insert into option_types (name, display_style) values ('Color', 'buttons')
    returning id into color_type_id;
  insert into option_values (option_type_id, value, position)
    values (color_type_id, 'Chestnut Brown', 0) returning id into brown_id;
  insert into option_values (option_type_id, value, position)
    values (color_type_id, 'Black', 1) returning id into black_id;
  insert into option_values (option_type_id, value, position)
    values (color_type_id, 'Tan', 2) returning id into tan_id;

  insert into option_types (name, display_style) values ('Thread Color', 'dropdown')
    returning id into thread_type_id;
  insert into option_values (option_type_id, value, position)
    values (thread_type_id, 'Natural', 0) returning id into natural_id;
  insert into option_values (option_type_id, value, position)
    values (thread_type_id, 'Contrast Black', 1) returning id into contrast_id;

  insert into option_types (name, display_style) values ('Size', 'buttons')
    returning id into size_type_id;
  insert into option_values (option_type_id, value, position)
    values (size_type_id, 'Small', 0) returning id into size_s_id;
  insert into option_values (option_type_id, value, position)
    values (size_type_id, 'Medium', 1) returning id into size_m_id;
  insert into option_values (option_type_id, value, position)
    values (size_type_id, 'Large', 2) returning id into size_l_id;

  -- ─── products ───────────────────────────────────────────────────────────

  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity)
  values (
    'heritage-messenger-bag', 'Heritage Messenger Bag',
    'Full-grain leather messenger bag, hand-stitched, brass hardware.',
    'Bags', 649900, 14, true, 8
  ) returning id into messenger_id;

  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity)
  values (
    'card-wallet', 'Card Wallet',
    'Slim card wallet, five card slots.',
    'Wallets', 99900, 5, true, 15
  ) returning id into card_wallet_id;

  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity)
  values (
    'weekender-duffel', 'Weekender Duffel',
    'Made-to-order weekender duffel, three sizes.',
    'Bags', 899900, 21, true, 0
  ) returning id into duffel_id;

  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity)
  values (
    'minimalist-cardholder', 'Minimalist Cardholder',
    'Single-piece leather cardholder, no options — one size, one look.',
    'Wallets', 59900, 3, true, 20
  ) returning id into minimalist_id;

  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled, stock_quantity)
  values (
    'limited-tote', 'Limited Tote',
    'Small-batch tote, currently paused.',
    'Bags', 429900, 14, false, 5
  ) returning id into limited_tote_id;

  -- ─── Heritage Messenger Bag: Color (all 3) + Thread Color ──────────────

  insert into product_options (product_id, option_type_id, position)
  values (messenger_id, color_type_id, 0) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, brown_id), (po_id, black_id), (po_id, tan_id);

  insert into product_options (product_id, option_type_id, position)
  values (messenger_id, thread_type_id, 1) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, natural_id), (po_id, contrast_id);

  -- ─── Card Wallet: same shared Color type, only 2 of its 3 values ───────

  insert into product_options (product_id, option_type_id, position)
  values (card_wallet_id, color_type_id, 0) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, brown_id), (po_id, black_id);

  -- ─── Weekender Duffel: Color (all) + Size, sold out ────────────────────

  insert into product_options (product_id, option_type_id, position)
  values (duffel_id, color_type_id, 0) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, brown_id), (po_id, black_id), (po_id, tan_id);

  insert into product_options (product_id, option_type_id, position)
  values (duffel_id, size_type_id, 1) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, size_s_id), (po_id, size_m_id), (po_id, size_l_id);

  -- Minimalist Cardholder gets no attached options at all — exercises the
  -- zero-option-types PDP/cart/checkout path.

  -- ─── Limited Tote: Color (Tan only), ordering paused ───────────────────

  insert into product_options (product_id, option_type_id, position)
  values (limited_tote_id, color_type_id, 0) returning id into po_id;
  insert into product_option_selections (product_option_id, option_value_id)
  values (po_id, tan_id);
end $$;
