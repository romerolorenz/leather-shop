# Manual Tasks — Leather Shop

Things that need a human to actually do them (external accounts, dashboard
clicks, pasted credentials, real assets) — things I can't do directly.
Check items off as they're done; add new ones as they come up per the
project rule in [CLAUDE.md](../CLAUDE.md).

## Outstanding

Ordered by what it blocks. All DEVELOPMENT_PLAN.md phases are complete, so
the order is: go-live / production blockers, then release blockers for
pending work, then dev-only or optional items, then items that don't
block anything (content, brand, photos).

- [ ] **Go-live blocker: split production from dev**
  (see [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md)). A **new** Supabase
  project is **production** and started clean; the old project stays as
  **dev**, so `.env.local` doesn't change. `<your domain>` is the domain
  under Vercel → Project → Settings → Domains, `<prod-ref>` is the ID in
  the prod project's URL (`https://<prod-ref>.supabase.co`), and
  `<prod URI>` is the Session pooler connection string from step 1.

  Where each sub-step happens: **Live site** = `https://<your domain>`;
  **Inbox** = your email; **Vercel** = [vercel.com](https://vercel.com),
  leather-shop project; **GitHub** =
  [github.com/romerolorenz/leather-shop](https://github.com/romerolorenz/leather-shop);
  **Supabase** = [supabase.com/dashboard](https://supabase.com/dashboard)
  (**· prod** = the `leather-shop-prod` project); **Terminal** = your
  Mac's terminal, in the repo folder.

  - [x] Done: steps 1–5 (prod project created + migrations `0001`–`0024`
    pushed, Google login set up for prod, `main` created as Vercel's
    production branch, production env vars pointed at the prod database,
    admin/customer login checked). Full steps in PRODUCTION_SETUP.md and
    in git history of this file.
  6. **Enter the real content.** Done: categories, options, products,
     sample products removed, payment methods, homepage, FAQ, and the
     phone check. Still to do:
     - [ ] **Live site** → `/admin/settings`: go through **every** field.
       That includes contact email, Instagram handle, admin notification
       email, shipping fee, delivery cities, order hold duration and
       payment instructions text. These are all defaults until you change
       them. (The nationwide-delivery release removes the delivery cities
       field, so skip it if that release is already live.)
     - [ ] **Live site** → `/admin/promo-codes`: recreate any real promo
       codes. Dev's codes don't carry over.
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
- [ ] **Blocks the nationwide-delivery release on prod: get it into
  `develop`, run migration `0025` and the PSGC seed on prod, then merge
  `develop` → `main`.** Holds up nationwide delivery going live. Needs the
  go-live split's prod database (steps 1–4 above, done). Prod starts with
  no saved addresses, so the seed only loads the reference data there.
  0. [x] Merged into `develop` (PR #22).
  1. [ ] **Terminal**: `supabase db push --db-url "<prod URI>" --dry-run`.
     It should list only `0025_nationwide_delivery_psgc.sql`. Then run it
     for real without `--dry-run`. The live site keeps working, because
     the migration only adds tables and columns.
  2. [ ] *Optional:* swap in a PSGC file you downloaded from PSA yourself
     before seeding prod (see `supabase/psgc/README.md` → "Refreshing to a
     newer PSA release"). Not required; the bundled 2Q 2026 copy is fine.
  3. [ ] **Supabase · prod** → Project Settings → Data API (Project URL)
     and API Keys (`service_role`). Then, in **Terminal**:
     `SUPABASE_URL="https://<prod-ref>.supabase.co" SUPABASE_SERVICE_ROLE_KEY="<prod service_role key>" node supabase/psgc/seed.mjs`.
     Check that it prints `Target: <prod-ref>.supabase.co` and
     `Upserted 42010 psgc_barangays`. If you ever re-seed prod later (a
     PSGC refresh), redeploy prod afterwards (Vercel → Deployments →
     latest Production → Redeploy) to clear Vercel's edge cache of the
     location lists.
  4. [ ] **GitHub**: merge `develop` → `main`. Wait for **Vercel** to
     finish the Production deploy.
  5. [ ] **Live site** → `/checkout`: place one order to an address
     outside Metro Manila (e.g. Cebu → City of Cebu → Lahug), using your
     own email. Check the email shows the full address. Then cancel it in
     `/admin/orders` (stock goes back).
  6. **Update shop text that still says "Metro Manila only".** This is
     content you edit in the admin, not code. Do it right after the
     release is live.
     - [ ] **Live site** → `/admin/faq`: rewrite the shipping answer. Say
       you deliver anywhere in the Philippines at one flat fee, and that
       provincial deliveries take longer than Metro Manila.
     - [ ] **Live site** → `/admin/settings` → Payment instructions text:
       if it mentions Metro Manila, update it.
     - [ ] **Live site** → `/admin/settings` → Shipping fee: decide
       whether the flat fee still works now that provincial orders cost
       more to ship. It's one fee for every order (no zones), so set what
       you're comfortable absorbing.
     - [ ] *Optional:* mention the longer provincial delivery in product
       descriptions or lead-time copy where it matters.
- [ ] **Blocks the order-safety release on prod: run migration `0026` on
  prod, then merge `develop` → `main`.** Do this after the
  nationwide-delivery release above (`0026` needs `0025`'s columns).
  Needs `fix/order-safety` merged into `develop` (`0026` already ran on
  dev, see completed/MANUAL_TASKS-archive.md). Safe to run before the deploy: it only adds functions and a
  trigger, and lowercases stored emails; the live code keeps working with
  it in place (see the header comment in the migration).
  1. [ ] *Recommended:* take a backup first. **Terminal**:
     `supabase db dump --db-url "<prod URI>" --data-only -f prod-backup.sql`.
  2. [ ] **Terminal**: `supabase db push --db-url "<prod URI>" --dry-run`.
     It should list only `0026_atomic_orders.sql` (plus `0025` if the
     nationwide release hasn't gone out yet; then do that item first).
     Then run it for real without `--dry-run`.
  3. [ ] **GitHub**: merge `develop` → `main`. Wait for **Vercel** to
     finish the Production deploy.
  4. [ ] **Live site** → `/checkout`: place one order with your email
     typed with a capital letter (e.g. `You@gmail.com`). Then, logged in,
     check it shows in **My Account**. Then cancel it in `/admin/orders`
     and check the product's stock goes back in `/admin/products`.
- [ ] **Blocks merging `feat/order-success-shop-order`: manual browser
  checks.** Migration `0027` ran on dev on 2026-10-18, and `npm test` and
  `npm run build` pass (apart from the two known seed-product files). Work
  through "Order success screen + shop order" in
  [MANUAL_TESTING.md](./MANUAL_TESTING.md).
- [ ] **Blocks the shop-order release on prod: run migration `0027` on
  prod, then merge `develop` → `main`.** Do this after the order-safety
  release above. Needs `feat/order-success-shop-order` merged into
  `develop` and `0027` run on dev (item above). **Order matters:** run the
  migration *before* merging to `main`. The new code (and the Vercel
  build, which reads the database) fails without the new columns, while
  the old code keeps working with them in place.
  1. [ ] *Recommended:* take a backup first. **Terminal**:
     `supabase db dump --db-url "<prod URI>" --data-only -f prod-backup.sql`.
  2. [ ] **Terminal**: `supabase db push --db-url "<prod URI>" --dry-run`.
     It should list only `0027_shop_order_positions.sql` (plus `0025`/
     `0026` if those releases haven't gone out yet; do those items first).
     Then run it for real without `--dry-run`.
  3. [ ] **GitHub**: merge `develop` → `main`. Wait for **Vercel** to
     finish the Production deploy.
  4. [ ] **Live site** → `/products`: the categories show alphabetically,
     products oldest first within each. Then set the order you want in
     `/admin/categories` and check `/products` follows it.
- [ ] **Go-live, doesn't block other steps: set up a receiving address on
  your domain** (e.g. `hello@hirayaleather.com`) so customer replies
  aren't lost. The sending address on `mail.hirayaleather.com` has no
  inbox. Free option: forward it to Gmail. In Namecheap → Advanced DNS →
  Mail Settings: if it shows "Email Forwarding", add the forward under
  Domain → Redirect Email; if it shows "Custom MX" (from the Resend
  setup), use a free forwarder like ImprovMX (its MX + SPF records on host
  `@`, which doesn't affect Resend on the `mail` subdomain). Optionally
  add it to Gmail "Send mail as". Then set **Contact email** in
  `/admin/settings` to it, and send a test email to confirm it arrives.
- [ ] **Go-live: stop shop emails landing in spam** (found 2026-10-17 via a
  public DNS lookup). DKIM (`resend._domainkey.mail`) is published.
  **No SPF/return-path records** were found at `send.mail.hirayaleather.com`,
  and there's **no DMARC record** at all.
  1. [ ] **Resend** → Domains → `mail.hirayaleather.com`: check that every
     record shows **Verified**. Any that don't (usually the `send.mail` MX +
     TXT `v=spf1 include:amazonses.com ~all`): **Namecheap** → Advanced
     DNS → add them exactly as Resend lists them. Use the host Resend shows
     *without* `.hirayaleather.com`, e.g. `send.mail`. Then click Verify in
     Resend.
  2. [ ] **Namecheap** → Advanced DNS → Add TXT record, host `_dmarc`, value
     `v=DMARC1; p=none; rua=mailto:<your inbox>`. Start with `p=none`
     (monitor only). After a few weeks of clean reports, change it to
     `p=quarantine`.
  3. [ ] Place a test order, then in **Gmail** open the email → ⋮ → **Show
     original**. SPF, DKIM and DMARC should all say **PASS**. Or send one to
     the address <https://www.mail-tester.com> gives you, and aim for 9/10
     or better.
  4. [ ] If an email still lands in spam, mark it **Not spam**. Early
     volume on a new domain is low, so a few "not spam" marks help.
  Related: the receiving-address item above (so replies don't bounce), and
  test runs no longer sending emails (`fix/test-safety`). A Reply-To on
  customer emails is logged in IMPROVEMENTS.md.
- [ ] **Dev only, blocks clean `npm test` runs (not go-live): the dev DB
  is missing `classic-bifold-wallet`/`tote-bag`, the seed products
  `tests/orders.test.ts` and `tests/api-orders.test.ts` depend on.** Both
  files fail in `beforeAll` with "Seed data missing — run
  `supabase/migrations/0001_init.sql` first." Likely leftover from
  running `supabase/scripts/wipe_test_data.sql`/`seed_test_data.sql`
  during the options-library manual testing pass (those replace the
  catalog with a different 5-product set). Re-seed those two products (or
  re-run `0001_init.sql`'s product seed) against the dev DB so the full
  suite passes clean again.
- [ ] **Optional, dev only: delete dev's 3 saved addresses from before
  nationwide delivery.** They have no PSGC barangay code, so checkout no
  longer offers them (they still show in `/account/addresses`, where
  editing one means picking its region, city and barangay). Production
  never had any. To clear them: **Supabase · dev** → SQL Editor →
  `delete from customer_addresses where barangay_code is null;` (it should
  report 3 rows). Or just leave them; nothing depends on them.
- [ ] **Doesn't block anything: refresh the PSGC address data now and
  then.** The bundled copy is PSA's 2Q 2026 release (30 June 2026). It was
  taken from a GitHub mirror because PSA's site blocks scripted
  downloads, so it's worth swapping in a file you downloaded from PSA
  yourself. In a browser, download the newest "PSGC Publication
  Datafile" `.xlsx` from <https://psa.gov.ph/classification/psgc>. Then
  follow `supabase/psgc/README.md` → "Refreshing to a newer PSA release":
  build, `npm test`, seed dev, seed prod. No migration is needed. Once or
  twice a year is plenty, or sooner if a customer can't find their
  barangay. This also covers using a PSA-downloaded file for the first
  prod seed (optional step 2 of the nationwide release above).
- [ ] **Doesn't block anything: provide real brand assets** (logo, color
  palette, final copy) — PRD §1 notes v1 is intentionally using
  placeholders.
- [ ] **Doesn't block anything: shoot the homepage Studio photo(s)**
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
- [ ] **Doesn't block anything: write the homepage Studio text** (/admin/homepage
  → Studio tab, Text fields): a 1–2 sentence quote
  in your own words (<140 chars, hidden until filled in), your name
  (required with a quote) and role, and switch the body copy from "we" to
  "I", e.g. "Every bag and wallet starts as a single hide, cut and
  hand-stitched in my small studio in Metro Manila. I work in small
  batches, not a production line, so each order gets my attention from
  start to finish."

## Done

Finished items are archived in [completed/MANUAL_TASKS-archive.md](./completed/MANUAL_TASKS-archive.md). Move items there once they're done.
