# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks — next-phase blockers first, then later-phase
blockers, then items that don't block any phase.

- [ ] **Run `supabase/migrations/0012_product_visibility.sql` against the
  live DB.** Adds `products.visible` (default `true`, so nothing already
  live changes state) — powers the new admin "Visible in shop" toggle on
  `/admin/products/<id>`. Until this runs, saving a product with that
  checkbox unchecked will fail (`column products.visible does not exist`),
  and `tests/products.test.ts`/`tests/admin-catalog-options.test.ts`'s
  product-input tests will fail the same way.
- [x] **Run `supabase/migrations/0010_product_level_stock.sql` then
  `supabase/migrations/0011_option_library_and_order_item_options.sql`
  against the live DB, in that order, then merge `feat/product-options`
  to `develop`.** Both are written but neither has run live yet. `0011`
  implements the "Second" and "Third" course corrections in
  `docs/PRODUCT_OPTIONS_DESIGN.md` (checkpoints 8/9): drops
  `product_variants`/`product_variant_options` entirely (any combination
  of a product's own option values is orderable, no admin-created variant
  row), and makes option types/values shop-wide/reusable
  (`option_types`/`option_values`, attached per-product via
  `product_options`/`product_option_selections`) instead of one row per
  product. It reads through the still-live `product_variant_options` →
  `product_option_values` → `product_option_types` chain before dropping
  any of it, so it must run *after* `0010` (which is what moves
  `stock_quantity` off `product_variants`), not before or instead of it.
  After both run: live-verify per `PRODUCT_OPTIONS_DESIGN.md`'s
  "Verification" section — `order_item_options` correctly backfilled from
  existing `product_variant_options`, and the shared option library
  correctly backfilled/merged from existing per-product
  `product_option_types`/`product_option_values` (read-only script against
  the dev DB) — **then also spot-check option `display_style` on every
  product that has 2+ option types with the same name** (e.g. if "Color"
  ever had a different display style set on two different products before
  this migration): the migration's merge-by-name step picks the majority
  style and could visibly change one of those product's PDPs. Full manual
  walkthrough checklist is in `MANUAL_TESTING.md`.
- [ ] **Go-live blocker, not a phase blocker: verify a domain on Resend.**
  Confirmed live: the sandbox sender (`onboarding@resend.dev`) can only
  send to your own account email (`marcolorenzoromero@gmail.com`) — it
  rejected even a `+alias` of that same address. This means **customer
  order-confirmation emails currently cannot reach any real customer**,
  only you. Same restriction now also blocks the new `/contact` form (adds
  a direct-email option alongside mailto/Instagram) — a message to any
  address but your own will fail with a "couldn't send" error until this
  is fixed. Code/tests are otherwise done (Phase 6). Verify a domain at
  resend.com/domains and set `RESEND_FROM_EMAIL` to an address on it
  before real customers place orders.
- [x] **Doesn't block any phase: update the placeholder Contact Us email.**
  `/admin/settings`'s "Contact Us email" is still `marco@example.com` (set
  during Phase 7 testing) — the new `/contact` form sends there, so it
  needs to be a real inbox you check before the form is useful.
- [x] **Doesn't block any phase: set the real Instagram handle.**
  `/admin/settings`'s new "Contact Us Instagram handle" field is still the
  placeholder `@yourshop` (migration `0008_contact_instagram_handle.sql`
  is run — this is just setting the real value) — update it via
  `/admin/settings` so `/contact` shows the actual handle instead of the
  placeholder.
- [ ] **Doesn't block any phase: provide real brand assets** (logo, color
  palette, final copy) — PRD §1 notes v1 is intentionally using
  placeholders.

## Done

- [x] Create the Supabase project.
- [x] Run `supabase/migrations/0001_init.sql` against it.
- [x] Rotate the Supabase database password.
- [x] Run `supabase/migrations/0002_stock_functions.sql` against it.
- [x] Set `CRON_SECRET` locally (generated automatically for testing —
  still need to set the same value in Vercel's env vars on deploy).
- [x] Decide on Facebook login — Google-only, no Facebook.
- [x] Set up Google OAuth for Supabase Auth (Google Cloud Console client +
  Supabase provider config).
- [x] Run `supabase/migrations/0003_admin_users.sql` against it.
- [x] Verify the live login flow: allow-listed email reaches `/admin`,
  a different Google account gets denied.
- [x] Run `supabase/migrations/0004_product_photos.sql` against it.
- [x] Run `supabase/migrations/0005_product_photo_gallery.sql` against it.
- [x] Set `RESEND_API_KEY` in `.env.local`.
- [x] Verify both order emails live: admin notification and customer
  confirmation (with HTML formatting + product photo) both actually
  arrived, sent to `marcolorenzoromero@gmail.com`.
- [x] Upload real product photos — done via the admin UI during testing.
- [x] Run `supabase/migrations/0006_faq_and_contact.sql` against it.
- [x] Run `supabase/migrations/0007_customer_addresses.sql` against it.
- [x] Push the repo to GitHub (`https://github.com/romerolorenz/leather-shop`, private, `develop` branch).
- [x] Deploy to Vercel — env vars set, `NEXT_PUBLIC_SITE_URL` pointed at
  the production domain, Supabase Auth redirect URLs updated, Cron job
  live on the daily schedule.
- [x] Mobile-device walkthrough (Phase 9 exit criteria): full browse →
  cart → checkout → place order flow, plus Google login → `/account` →
  `/account/addresses`, both verified working on a real device.
- [x] Fix local Google login redirecting without creating a session —
  Supabase's Redirect URLs list needs a wildcard (`http://localhost:3000/**`),
  not just the exact `/auth/callback` path, since the app's requested
  `redirectTo` includes a `?next=...` query string that didn't match the
  non-wildcard entry.
- [x] Run `supabase/migrations/0008_contact_instagram_handle.sql` against it.
- [x] Run `supabase/migrations/0009_product_options.sql` against it —
  verified live: existing variants correctly migrated to a "Color" option
  type per product, `product_variants.label` dropped, historical
  `order_items.variant_label` backfilled.
