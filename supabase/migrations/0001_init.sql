-- Initial schema — see ARCHITECTURE.md § Data Model.
-- Run this in the Supabase SQL editor, or via `supabase db push` if you're
-- using the Supabase CLI with this project linked.

create extension if not exists "pgcrypto";

-- ─── products ────────────────────────────────────────────────────────────

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null,
  price_centavos integer not null check (price_centavos >= 0),
  lead_time_days integer not null default 0,
  ordering_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  -- In-stock items: a real count. Made-to-order items: a capacity
  -- threshold, not physical stock. See PRD §5.
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  in_stock boolean generated always as (stock_quantity > 0) stored,
  created_at timestamptz not null default now(),
  unique (product_id, label)
);

-- ─── orders ──────────────────────────────────────────────────────────────

create table orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'shipped', 'cancelled')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_street text not null,
  shipping_city text not null,
  subtotal_centavos integer not null check (subtotal_centavos >= 0),
  shipping_centavos integer not null check (shipping_centavos >= 0),
  total_centavos integer not null check (total_centavos >= 0),
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  variant_id uuid not null references product_variants(id),
  quantity integer not null check (quantity > 0),
  -- Snapshotted at order time so a later price change doesn't rewrite
  -- historical order totals.
  unit_price_centavos integer not null check (unit_price_centavos >= 0)
);

create index order_items_order_id_idx on order_items(order_id);
create index orders_status_created_at_idx on orders(status, created_at);

-- ─── settings ────────────────────────────────────────────────────────────
-- Admin-editable shop configuration. See CLAUDE.md's project rule: settings
-- are configurable, not hardcoded, unless stated otherwise.

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into settings (key, value) values
  ('shipping_fee_centavos', '15000'),
  ('delivery_cities', '[
    "Caloocan", "Las Piñas", "Makati", "Malabon", "Mandaluyong",
    "Manila", "Marikina", "Muntinlupa", "Navotas", "Parañaque",
    "Pasay", "Pasig", "Pateros", "Quezon City", "San Juan", "Taguig",
    "Valenzuela"
  ]'),
  ('admin_notification_email', '"marcolorenzoromero@gmail.com"'),
  ('order_payment_hold_hours', '48');

-- ─── seed data ───────────────────────────────────────────────────────────
-- Mirrors the mock data currently in src/lib/products.ts, so Phase 2
-- (storefront reads from Supabase) has something to render against.

with wallet as (
  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled)
  values (
    'classic-bifold-wallet',
    'Classic Bifold Wallet',
    'Full-grain leather bifold wallet, hand-stitched.',
    'Wallets',
    189900,
    5,
    true
  )
  returning id
)
insert into product_variants (product_id, label, stock_quantity)
select id, label, stock_quantity from wallet, (values
  ('Chestnut Brown', 10),
  ('Black', 10)
) as v(label, stock_quantity);

with tote as (
  insert into products (slug, name, description, category, price_centavos, lead_time_days, ordering_enabled)
  values (
    'tote-bag',
    'Everyday Tote Bag',
    'Made-to-order tote, hand-cut and hand-stitched.',
    'Bags',
    429900,
    14,
    true
  )
  returning id
)
insert into product_variants (product_id, label, stock_quantity)
select id, label, stock_quantity from tote, (values
  ('Chestnut Brown', 5),
  ('Black', 0)
) as v(label, stock_quantity);

-- ─── row level security ────────────────────────────────────────────────
-- All app access currently goes through the Next.js API layer using the
-- Supabase service-role key (server-only — see src/lib/supabase/server.ts),
-- which bypasses RLS entirely. These tables live in the `public` schema,
-- which Supabase's auto-generated REST API exposes by default — enabling
-- RLS with no policies blocks the anon/authenticated roles from reading or
-- writing anything directly (default-deny), without affecting the
-- service-role access this app actually uses. Add specific policies later
-- if/when browser code ever queries Supabase directly (e.g. customer
-- order history in Phase 8).

alter table products enable row level security;
alter table product_variants enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table settings enable row level security;
