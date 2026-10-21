# Manual Tasks — Archive (Done)

Archived from [MANUAL_TASKS.md](../MANUAL_TASKS.md) on 2026-10-18. Finished items only; kept for the record.

## Done

- [x] **Release 0.2.0 shipped to production** (2026-10-21, PR #30, tag
  `v0.2.0`, back-merged in PR #31). Nationwide delivery, Buy now, order
  safety, order success screen + shop order, Hiraya titles and brown
  option buttons. Prod backup taken; prod's empty migration history
  repaired (`0001`–`0024` marked applied), then `0025`–`0027` pushed and
  the PSGC data seeded (42,010 barangays). Live test order outside Metro
  Manila placed and cancelled, category order set, and the "Metro Manila
  only" shop text (FAQ, payment instructions, shipping fee) updated.
  Before any prod command, check `DBURL` points at `blwttockcyyxjdlejoav`
  (prod), not `yahrzlvemyzjcbveqzfb` (dev).

- [x] Create the Supabase project.
- [x] Run `supabase/migrations/0001_init.sql` against it.
- [x] Rotate the Supabase database password.
- [x] Run `supabase/migrations/0002_stock_functions.sql` against it.
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
- [x] Push the repo to GitHub (`https://github.com/romerolorenz/leather-shop`,
  `develop` branch; was private at the time, currently public — see
  go-live step 9).
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
- [x] Run `supabase/migrations/0009_product_options.sql` — existing
  variants migrated to a per-product "Color" option type.
- [x] Run `0010_product_level_stock.sql` + `0011_option_library_and_order_item_options.sql`
  on the live DB, then merge `feat/product-options` to `develop` — shared
  option library + `order_item_options`.
- [x] Run `supabase/migrations/0012_product_visibility.sql` on the live DB
  — powers the admin "Visible in shop" toggle.
- [x] Update the placeholder Contact Us email in `/admin/settings` to a
  real inbox.
- [x] Set the real Instagram handle in `/admin/settings`.
- [x] Run `supabase/migrations/0013_homepage_featured_hero_and_text.sql`
  on dev — powers US-38 (featured products, hero image, homepage text).
- [x] Upload the real hero image via `/admin/homepage` — confirmed live,
  `settings.hero_image_url` and a non-center focal point are both set.
- [x] Run `0014_categories.sql` + `0015_promo_codes.sql` on dev —
  `categories` table and promo codes (docs/IMPROVEMENTS.md's "Promo code
  capability").
- [x] Run `supabase/migrations/0016_promo_code_limit_one_per_customer.sql`
  on dev — "Limit to one redemption per customer" checkbox.
- [x] Run `supabase/migrations/0017_product_details.sql` on dev — product
  `dimensions`/`details` columns (fixed the `/products` + PDP 500s).
- [x] Run `supabase/migrations/0018_ph_address_fields.sql` on dev — fuller
  Philippine address fields on addresses and orders (docs/design/checkout.md).
- [x] Run `supabase/migrations/0019_payment_methods.sql` on dev —
  `payment_methods` table + `settings.payment_instructions_text`, powering
  `/admin/payment-methods` and "Send payment details".
- [x] Run `supabase/migrations/0020_payment_methods_drop_type.sql` on dev
  — dropped the bank-vs-e-wallet `type`; one flat payment-methods list.
- [x] Run `supabase/migrations/0021_orders_status_tracking.sql` on dev —
  `payment_details_sent` order status + `status_updated_at`, powering the
  status/date on `/admin/orders` and the dashboard's "Needs attention".
- [x] Verify a domain on Resend (DKIM/SPF/MX via Namecheap) and set
  `RESEND_FROM_EMAIL` to an address on it — customer emails can now reach
  real customers, not just the owner inbox (done 2026-10-03).
- [x] Point the custom (sub)domain at the Vercel app — Vercel domain +
  Namecheap `CNAME`, `NEXT_PUBLIC_SITE_URL` updated + redeployed,
  Supabase Site URL / Redirect URLs updated (done 2026-10-03).
- [x] Set the email sender display name via `RESEND_FROM_EMAIL`
  (`Name <address>` format, Vercel env + redeploy) (done 2026-10-04).
- [x] Run `supabase/migrations/0022_homepage_studio_profile.sql` (Studio
  photo & maker settings keys) and reset the two studio image URLs left by
  a failed test run (done 2026-10-04).
- [x] Run `supabase/migrations/0023_set_setting_fn.sql` (`set_setting()`
  for clearing settings to JSON null) on dev (done 2026-10-04); prod got
  it via go-live step 1.
- [x] Run `supabase/migrations/0024_lock_down_function_grants.sql` (stock/
  promo functions server-only; new functions locked by default) on dev
  (done 2026-10-04); prod got it via go-live step 1.
- [x] Run migration `0025` (nationwide delivery) + the PSGC seed on dev
  (done 2026-10-17), re-seeded after the City of Manila revert; `npm test`
  and the MANUAL_TESTING.md pass both done.
- [x] Marked the dev `.env.local` with `SUPABASE_ENV=dev`, the test-suite
  prod guard (PR #24). The full `npm test` passed with it (2026-10-17).
  Keep the line if `.env.local` is ever recreated. Never set it on Vercel.
- [x] Ran migration `0026` (order safety: atomic order creation and
  cancellation, case-insensitive emails) on dev (2026-10-17), and
  re-applied it after the first round of review fixes.
- [x] Re-ran the edited `0026` on dev after the review fixes (cancel
  lock order, re-runnable triggers, promo locked first). The full
  `npm test` passed apart from the two known seed files (2026-10-17).
