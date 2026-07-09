-- US-38: homepage featured products (admin-toggled, max 3, enforced in
-- app code — src/lib/admin/catalog.ts), a standalone hero image (not tied
-- to any product's own photos, per user decision), and six homepage text
-- fields moving from hardcoded copy (src/app/page.tsx) into `settings`.
-- See docs/USER_STORIES.md US-38 and docs/design/homepage.md §5.2's
-- "Data-model gap" note this closes.

-- ─── Part A: featured products ─────────────────────────────────────────

alter table products
  add column featured boolean not null default false,
  add column featured_position integer;

-- Partial index: cheap lookup/order for the homepage query, and makes the
-- "at most 3" invariant visible in the schema even though it's enforced in
-- app code, not by a constraint (a real max-3 constraint needs a trigger;
-- not worth it for a toggle only ever exercised from one admin page).
create index products_featured_position_idx
  on products (featured_position)
  where featured = true;

-- Backfill: preserve today's hardcoded featured grid (src/app/page.tsx's
-- FEATURED_SLUGS) so this migration doesn't blank the live homepage.
-- heritage-messenger-bag (today's HERO_SLUG) is deliberately NOT
-- backfilled here — Part B decouples the hero into a standalone image, so
-- it's no longer a product-driven concept at all; "featured" now means
-- only the up-to-3-product grid US-38 describes.
update products set featured = true, featured_position = 0
  where slug = 'weekender-duffel';
update products set featured = true, featured_position = 1
  where slug = 'card-wallet';
update products set featured = true, featured_position = 2
  where slug = 'minimalist-cardholder';

-- ─── Part B: hero image (standalone, not a product photo) ──────────────

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

-- hero_image_url seeds null, not a real URL — the current homepage hero
-- comes from heritage-messenger-bag's own product photo, and copying that
-- file into site-images at migration time would quietly reintroduce the
-- product-photo coupling the hero is explicitly designed not to have
-- (see docs/IMPROVEMENTS.md's US-38 note). Admin uploads the real hero
-- image once via /admin/homepage after this migration runs — tracked in
-- docs/MANUAL_TASKS.md. Until then, page.tsx's hero section renders
-- nothing (falsy hero_image_url), same null-guard style as today's
-- `{hero && (...)}`.

-- ─── Part C: homepage text + hero focal point settings ─────────────────

insert into settings (key, value) values
  ('hero_image_url', 'null'),
  ('hero_focal_x', '50'),
  ('hero_focal_y', '50'),
  ('homepage_hero_eyebrow', '"Handcrafted in Metro Manila"'),
  ('homepage_hero_headline', '"Handcrafted leather, made in small batches."'),
  ('homepage_featured_eyebrow', '"Chosen by the Studio"'),
  ('homepage_featured_heading', '"The Selection"'),
  ('homepage_studio_heading', '"The studio"'),
  ('homepage_studio_body', '"Every bag and wallet starts as a single hide, cut and hand-stitched in a small studio in Metro Manila. We work in small batches, not a production line, so each order gets real attention from start to finish."');
