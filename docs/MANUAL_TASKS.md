# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks — next-phase blockers first, then later-phase
blockers, then items that don't block any phase.

- [ ] **Go-live blocker: split production from dev**
  (see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)). A **new** Supabase
  project becomes **production** and starts clean, with no data copied.
  The current project stays as **dev**, so `.env.local` doesn't change.
  Do the steps in order. Steps 1–3 don't affect the live site. Steps 4–7
  should be done in one sitting, because the live storefront is empty
  from the cutover until the content is entered. Throughout,
  `<your domain>` means the domain listed under Vercel → Project →
  Settings → Domains, and `<prod-ref>` is the ID in the new project's URL
  (`https://<prod-ref>.supabase.co`).

  Each sub-step starts with the place to do it:
  - **Supabase · dev**: [supabase.com/dashboard](https://supabase.com/dashboard), opened on the existing project.
  - **Supabase · prod**: the same dashboard, opened on the new `leather-shop-prod` project.
  - **Vercel**: [vercel.com](https://vercel.com), opened on the leather-shop project.
  - **Google Cloud**: [console.cloud.google.com](https://console.cloud.google.com), opened on the project that holds the OAuth client.
  - **GitHub**: [github.com/romerolorenz/leather-shop](https://github.com/romerolorenz/leather-shop).
  - **Terminal**: your Mac's terminal, in the repo folder.
  - **Live site**: `https://<your domain>` in a browser.
  - **Inbox**: your email.

  1. **Create the production Supabase project and its tables.**
     - [x] **Supabase · dev** → Project Settings → General → note the
       Region.
     - [x] **Supabase** (dashboard home, no project open) → New project.
       Name it `leather-shop-prod`, pick the **same region**, and
       generate a strong database password. Save the password in your
       password manager. You need it in the next step, and it can't be
       viewed again (only reset).
     - [x] **Terminal**: `brew install supabase/tap/supabase`.
     - [x] **Supabase · prod** → **Connect** (top bar) → Connection
       String → **Session pooler** → copy the URI. Replace
       `[YOUR-PASSWORD]` with the password. If the password has
       `@ # / ? : %`, URL-encode them (or reset it to letters and digits).
     - [x] **Terminal** (repo root): run a dry run,
       `supabase db push --db-url "<prod URI>" --dry-run`. It should list
       `0001_init.sql` through `0024_lock_down_function_grants.sql`. If it
       asks for a config file, run `supabase init` once (answer **N** to
       the VS Code/IntelliJ prompts) and retry.
     - [x] **Terminal**: run it for real,
       `supabase db push --db-url "<prod URI>"`. It should finish with no
       errors.
     - [x] **Supabase · prod** → Table Editor should show `products`,
       `orders`, `settings`, `admin_users` and the rest. `admin_users`
       should have one row, your email. **Supabase · prod** → Storage
       should show two buckets, `product-photos` and `site-images`.
     - *If you'd rather not install the CLI:* in **Terminal**, run
       `cat supabase/migrations/*.sql | pbcopy`. Then in
       **Supabase · prod** → SQL Editor → New query, paste it and click
       Run. Then do the same checks.
  2. **Set up Google login for production.** None of this affects the
     live site yet.
     - [x] **Supabase · dev** → Authentication → Sign In / Providers →
       Google → copy the client ID and secret. If the secret is hidden,
       get it from **Google Cloud** → APIs & Services → Credentials →
       your OAuth client.
     - [x] **Supabase · prod** → Authentication → Sign In / Providers →
       Google → Enable. Paste the same client ID and secret, then Save.
       Copy the **Callback URL** shown there
       (`https://<prod-ref>.supabase.co/auth/v1/callback`).
     - [x] **Google Cloud** → APIs & Services → Credentials → your OAuth
       client → **Authorized redirect URIs** → Add URI → paste that
       callback URL → Save. Keep dev's existing URI there too.
     - [x] **Supabase · prod** → Authentication → URL Configuration. Set
       **Site URL** to `https://<your domain>`. Under **Redirect URLs**,
       add `https://<your domain>/**`. The `/**` wildcard is required
       (see the localhost login fix in Done).
  3. **Create `main` and make it the production branch.** The live site
     keeps using the old database, and only the deploy branch changes.
     - [x] **Terminal**: `git checkout develop && git pull && git checkout -b main && git push -u origin main`.
     - [x] **Vercel** → Settings → **Environments** → Production →
       Branch Tracking → set it to `main` → Save. (On older dashboards
       this is Settings → Git → Production Branch.)
     - [x] **GitHub** → Settings → General → check that Default branch is
       still `develop`.
     - [x] **Vercel** → Deployments → redeploy the latest `main` commit
       as Production. Check that the deployment shows branch `main` and
       that the **Live site** still loads.
  4. **Point production at the new database.** Here the live site
     switches over and goes empty.
     - [x] **Supabase · prod** → Project Settings → **Data API**: copy
       the Project URL. **Supabase · prod** → Project Settings → **API
       Keys**: copy the `anon` key and the `service_role` key. If the
       page shows "publishable/secret" keys first, open the **Legacy API
       Keys** tab so prod matches what dev uses.
     - [x] **Vercel** → Settings → Environment Variables. For each of
       `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
       `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (and
       `SUPABASE_ANON_KEY` if it's listed): Edit → untick
       **Production**, so it stays on Preview + Development only → Save.
     - [x] **Vercel** → Settings → Environment Variables → Add each of
       those vars again with the prod values, ticking **Production
       only**. The URL vars get the Project URL, both anon vars get the
       `anon` key, and `SUPABASE_SERVICE_ROLE_KEY` gets the
       `service_role` key.
     - [x] **Vercel**: leave `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
       `CRON_SECRET` and `NEXT_PUBLIC_SITE_URL` unchanged.
     - [x] **Vercel** → Deployments → latest Production deployment → ⋯ →
       **Redeploy**. Untick "Use existing build cache", because the
       `NEXT_PUBLIC_*` values are baked in at build time.
     - [x] **Live site** → `/products` should show only the two sample
       products from `0001`. That confirms it's reading the new database.
  5. **Check login.**
     - [x] **Live site** → `/admin` in a private window → sign in with
       `marcolorenzoromero@gmail.com`. You should reach the dashboard.
     - [x] **Live site**: sign out, then sign in with a different Google
       account. It should be denied `/admin` but able to reach
       `/account`.
     - [x] **Supabase · prod** → Authentication → Users should now list
       both accounts.
  6. **Enter the real content.** Everything here is on the **Live site**
     → `/admin`. Do it in this order so each step has what it needs:
     - [x] **Live site** → `/admin/categories`: create the real
       categories.
     - [x] **Live site** → `/admin/options`: create the option types and
       values (Color, Thread Color, etc.).
     - [x] **Live site** → `/admin/products`: create each real product
       with its category, options, price, stock, details and photos. Set
       it visible.
     - [x] **Live site** → `/admin/products`: delete or hide (untick
       "Visible in shop") the two samples, **Classic Bifold Wallet** and
       **Everyday Tote Bag**. Then, in `/admin/categories`, delete their
       sample categories if they aren't used.
     - [x] **Live site** → `/admin/payment-methods`: add each bank and
       e-wallet with its QR image.
     - [ ] **Live site** → `/admin/settings`: go through **every** field.
       That includes contact email, Instagram handle, admin notification
       email, shipping fee, delivery cities, order hold duration and
       payment instructions text. These are all defaults until you change
       them.
     - [x] **Live site** → `/admin/homepage`: in the **Hero** tab, set
       the image and focal point. In **Featured**, pick products. In
       **Studio**, set the photo and text, or leave them until the Studio
       photo/text items below are done.
     - [x] **Live site** → `/admin/faq`: replace the placeholder
       questions.
     - [ ] **Live site** → `/admin/promo-codes`: recreate any real promo
       codes. Dev's codes don't carry over.
     - [x] **Live site**, on your phone: browse the homepage, `/products`,
       one product page, `/faq`, `/contact` and `/privacy`. There should
       be no sample products and no placeholder text.
  7. **Place one real order end to end.**
     - [ ] **Live site**: place an order using your own email.
     - [ ] **Inbox**: check that both emails arrive. One is the customer
       confirmation. The other is the admin notification, sent to the
       address set in step 6.
     - [ ] **Live site** → `/admin/orders` → open the order → **Send
       payment details**. Then, in your **Inbox**, check that the email
       arrives with the QR images.
     - [ ] **Live site** → `/admin/orders`: cancel the order. Then, in
       `/admin/products`, check that the product's stock goes back to
       what it was.
  8. **Check the cron job.**
     - [ ] **Vercel** → Settings → **Cron Jobs**: `/api/orders/expire`
       should be listed and enabled, scheduled `0 16 * * *` (midnight
       Manila time).
     - [ ] **Vercel** → Settings → Cron Jobs → `/api/orders/expire` →
       View Logs, the morning after. The run should show 200, not 401.
       A 401 means `CRON_SECRET` isn't set for Production.
  9. **Make the repo private** (optional, recommended).
     - [ ] **GitHub** → Settings → General → Danger Zone → **Change
       repository visibility** → Private.
     - [ ] **GitHub**: merge any small PR into `develop`. Then, in
       **Vercel** → Deployments, check that a Preview still builds. If it
       doesn't, reconnect the repo in **Vercel** → Settings → Git.
  10. **Decide on plans** (see PRODUCTION_SETUP.md § Open questions).
      - [ ] **Vercel** → Settings → Billing: check the plan. Hobby is for
        non-commercial use only, and Pro is US$20/month.
      - [ ] **Supabase** (dashboard home) → your organization → Billing.
        Billing is per organization, not per project. Decide whether to
        upgrade to Pro (US$25/month, daily backups). If not
        yet, take a manual backup before any risky migration. In
        **Terminal**, run
        `supabase db dump --db-url "<prod URI>" --data-only -f prod-backup.sql`.
- [ ] **Go-live, not a phase blocker: set up a receiving address on your
  domain** (e.g. `hello@hirayaleather.com`) so customer replies aren't
  lost. The sending address on `mail.hirayaleather.com` has no inbox.
  Free option: forward it to Gmail. In Namecheap → Advanced DNS → Mail
  Settings: if it shows "Email Forwarding", add the forward under Domain →
  Redirect Email; if it shows "Custom MX" (from the Resend setup), use a
  free forwarder like ImprovMX (its MX + SPF records on host `@`, which
  doesn't affect Resend on the `mail` subdomain). Optionally add it to
  Gmail "Send mail as". Then set **Contact email** in `/admin/settings` to
  it, and send a test email to confirm it arrives.
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
- [ ] **Doesn't block any phase: shoot the homepage Studio photo(s)**
  (docs/design/studio-profile.md §10). Phone, natural side-window light,
  no flash; tidy bench, tools in use. Portrait orientation, ≥1600×2000
  (cropped 4:5; set the focal point after upload). Pick one:
  - **A — you at the bench** (no portrait needed): waist-up, 1–2 m away,
    looking at the work, face + hands in frame, room around your head.
    Ask someone or use a timer.
  - **B — hands at work + a portrait**: close-up of saddle-stitching,
    burnishing or cutting, hands/leather filling the frame; plus a
    head-and-shoulders portrait, plain background, face centred, square
    ≥400×400 (shown as a small circle).
  Avoid filters, logo overlays, stock photos. Upload in /admin/homepage →
  Studio tab ("Studio photo & maker"), and fill in the photo description
  in that tab's Text fields.
- [ ] **Doesn't block any phase: write the homepage Studio text** (/admin/homepage
  → Studio tab, Text fields): a 1–2 sentence quote
  in your own words (<140 chars, hidden until filled in), your name
  (required with a quote) and role, and switch the body copy from "we" to
  "I", e.g. "Every bag and wallet starts as a single hide, cut and
  hand-stitched in my small studio in Metro Manila. I work in small
  batches, not a production line, so each order gets my attention from
  start to finish."

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
  for clearing settings to JSON null) on dev (done 2026-10-04). Run it on
  any separate production database before `design/studio-profile` deploys.
- [x] Run `supabase/migrations/0024_lock_down_function_grants.sql` (stock/
  promo functions server-only; new functions locked by default) on dev
  (done 2026-10-04). Run it on any separate production database before
  `fix/lock-down-db-functions` deploys.
