# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks — next-phase blockers first, then later-phase
blockers, then items that don't block any phase.

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
- [ ] **Blocks clean `npm test` runs, not a phase or go-live blocker: the
  dev DB is missing `classic-bifold-wallet`/`tote-bag`, the seed products
  `tests/orders.test.ts` and `tests/api-orders.test.ts` depend on.** Both
  files fail in `beforeAll` with "Seed data missing — run
  `supabase/migrations/0001_init.sql` first." Confirmed via `git stash`
  this predates today's option-library fixes — likely leftover from
  running `supabase/scripts/wipe_test_data.sql`/`seed_test_data.sql`
  during the options-library manual testing pass (those replace the
  catalog with a different 5-product set, not `0001_init.sql`'s
  originals). Re-seed those two products (or re-run `0001_init.sql`'s
  product seed) against the dev DB so the full suite passes clean again.
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
- [x] Run `supabase/migrations/0010_product_level_stock.sql` then
  `supabase/migrations/0011_option_library_and_order_item_options.sql`
  against the live DB, then merge `feat/product-options` to `develop` —
  `order_item_options` and the shared option library verified correctly
  backfilled from the prior per-product variant/option data.
- [x] Run `supabase/migrations/0012_product_visibility.sql` against the
  live DB — powers the admin "Visible in shop" toggle on
  `/admin/products/<id>`.
- [x] Update the placeholder Contact Us email in `/admin/settings` to a
  real inbox.
- [x] Set the real Instagram handle in `/admin/settings`.
- [x] Run `supabase/migrations/0013_homepage_featured_hero_and_text.sql`
  against the dev DB — powers US-38 (featured products, hero image,
  editable homepage text); `npm test`'s new `admin-homepage-*.test.ts`
  files pass clean against it.
- [x] Upload the real hero image via `/admin/homepage` — confirmed live,
  `settings.hero_image_url` and a non-center focal point are both set.
- [x] Run `supabase/migrations/0014_categories.sql` then
  `supabase/migrations/0015_promo_codes.sql` against the dev DB —
  normalizes `products.category` into a real `categories` table and adds
  `promo_codes`/`promo_code_categories`/`promo_code_redemptions` +
  the atomic `redeem_promo_code()` function (docs/IMPROVEMENTS.md's
  "Promo code capability"); `categories.test.ts`/`promo-codes.test.ts`/
  `api-promo-codes-apply.test.ts`/`api-orders-promo.test.ts` pass clean
  against it.
- [x] Run `supabase/migrations/0016_promo_code_limit_one_per_customer.sql`
  against the dev DB — powers the promo-code admin form's "Limit to one
  redemption per customer" checkbox (default on, existing codes
  unaffected); new cases in `promo-codes.test.ts`/`api-orders-promo.test.ts`
  pass clean against it.
- [x] Run `supabase/migrations/0017_product_details.sql` against the dev
  DB — restored `/products` and every PDP from the 500 they'd been
  throwing since `PRODUCT_SELECT` started requesting the (until-now
  nonexistent) `dimensions`/`details` columns; full `npm test` back to
  only the two pre-existing unrelated seed-data failures; new
  `products.test.ts` cases pass; live-verified end-to-end via the admin
  edit page → storefront PDP.
- [x] Run `supabase/migrations/0018_ph_address_fields.sql` against the
  dev DB — adds `address2`/`barangay`/`postal_code` to
  `customer_addresses` and the `shipping_`-prefixed equivalents to
  `orders` (docs/design/checkout.md "Fuller Philippine address shape").
  Verified live: existing 8 orders / 3 addresses untouched (new columns
  came back `null`, no backfill needed); `/account/addresses` shows the
  fuller address; checkout's address cards submit correctly (placed two
  real test orders via the synthetic session, both landed in admin's
  Orders view with the full shipping address, then cleaned up — stock
  and row counts back to exactly where they started); `npm test` back to
  only the two pre-existing unrelated seed-data failures (69 passed).
- [x] Run `supabase/migrations/0019_payment_methods.sql` against the dev
  DB — adds the `payment_methods` table (bank/e-wallet entries, each with
  an optional per-row QR image) and `settings.payment_instructions_text`,
  powering the new "Send payment details" order action and
  `/admin/payment-methods` admin page (docs/IMPROVEMENTS.md).
  `tests/payment-methods.test.ts` (create/list/update/delete both types,
  independent per-type positioning, reorder) now passes clean against it;
  live-verified `sendPaymentDetailsEmail()` end-to-end via a scratch bank
  + e-wallet entry and a real order (Resend accepted the send, scratch
  entries cleaned up after). `npm test` back to only the two pre-existing
  unrelated seed-data failures plus one pre-existing flaky
  `promo-codes.test.ts` `afterAll` cleanup hook timeout (confirmed via
  `git stash` to reproduce identically without this feature's changes) —
  84 passed.
- [x] Run `supabase/migrations/0020_payment_methods_drop_type.sql` against
  the dev DB — course correction to `0019` (dropped the bank-vs-e-wallet
  `type` distinction, one flat payment-methods list instead). Table was
  empty in production, so this was a plain column drop, no data to
  migrate — confirmed live: a real `payment_methods` row you'd already
  added through `/admin/payment-methods` (a GCash entry with a real QR
  image) came through with no `type` column and wasn't touched.
  `tests/payment-methods.test.ts` updated for the flat design now passes
  clean against it (2 tests); live-verified `sendPaymentDetailsEmail()`
  end-to-end again using that real entry + a real order (read-only, Resend
  accepted the send). `npm test` back to only the two pre-existing
  unrelated seed-data failures — 82 passed (test count dropped from 84 to
  82 since the flat design collapsed the "both types" test into one).
- [x] Run `supabase/migrations/0021_orders_status_tracking.sql` against
  the dev DB — adds `payment_details_sent` as a real order status
  (between `pending_payment` and `paid`) and a single `status_updated_at`
  timestamp shared by every status-changing action, powering the
  "Payment details sent" status + date shown on `/admin/orders` and the
  `/admin` dashboard's "Needs attention" list. Fully verified end-to-end
  this time, not just confirmed-blocked: a real manual click-through pass
  (`docs/MANUAL_TESTING.md`'s "Payment methods + 'Send payment details'
  email" checklist) exercised send, resend, mark paid, cancel, the
  dashboard's Needs Attention list, and `/account`'s "Payment details
  sent" grouping against real orders — all transition logic
  (`markPaymentDetailsSent`/`markOrderPaid`/`cancelOrderAndRestoreStock`/
  `getExpiredPendingOrderIds`) confirmed correct. That pass did surface
  two real UI bugs (status timestamp shows date only, no time; "Send
  payment details" button still shows on `paid` orders) — tracked as
  their own follow-up tickets in `docs/IMPROVEMENTS.md` rather than as
  something wrong with this migration. `tests/orders.test.ts`'s new
  lifecycle test cases remain skipped, same as that file's pre-existing
  cases — blocked on the unrelated missing-seed-data item above, not on
  this migration; `npm test` is otherwise unchanged (82 passed).
