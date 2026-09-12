-- Admin-triggered "payment details" email (docs/IMPROVEMENTS.md). Bank/
-- e-wallet entries are variable-length lists, so they don't fit the
-- key/value `settings` table — a real table instead, positioned per type
-- (a bank entry and an e-wallet entry can both hold position 0). Each
-- entry can carry its own QR image (e.g. a GCash QR differs from a Maya
-- QR), so `qr_image_url` lives on the row rather than as one shared
-- `settings` value. The free-form instructions text is still a single
-- shop-wide value and stays in `settings`, added below.

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('bank', 'ewallet')),
  label text not null,
  account_name text not null,
  account_number text not null,
  qr_image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table payment_methods enable row level security;

insert into settings (key, value) values
  ('payment_instructions_text', '""');
