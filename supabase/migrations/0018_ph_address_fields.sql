-- Fuller Philippine shipping address shape (docs/design/checkout.md
-- "Fuller Philippine address shape") — customer_addresses and orders both
-- only captured street + city; real PH delivery needs an apartment/unit
-- line, barangay, and postal code too.
--
-- Added as nullable columns rather than backfilling existing rows (this
-- dev project already has 8 orders / 3 customer_addresses) — "required"
-- for these fields is enforced at the application layer (checkout and
-- the account address form) for anything submitted from here on, not as
-- a DB constraint that would need a backfill value for pre-existing rows.

alter table customer_addresses
  add column address2 text,
  add column barangay text,
  add column postal_code text;

alter table orders
  add column shipping_address2 text,
  add column shipping_barangay text,
  add column shipping_postal_code text;
