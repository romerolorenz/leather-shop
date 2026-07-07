-- Saved shipping addresses for logged-in customers (Phase 8, US-18). See
-- docs/ARCHITECTURE.md § Data Model. Keyed by user_email (the Google
-- account's verified email) rather than a Supabase auth user id — matches
-- the existing pattern of matching orders.customer_email to the logged-in
-- session's email (see docs/DEVELOPMENT_PLAN.md Phase 8).

create table customer_addresses (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  label text not null default 'Home',
  recipient_name text not null,
  phone text not null,
  street text not null,
  city text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index customer_addresses_user_email_idx on customer_addresses(user_email);

-- Same default-deny pattern as every other table — all access goes through
-- the service-role key server-side (src/lib/customer/addresses.ts), which
-- always scopes reads/writes to the caller's own user_email (enforced in
-- app code, verified via assertCustomer() in every Server Action).
alter table customer_addresses enable row level security;
