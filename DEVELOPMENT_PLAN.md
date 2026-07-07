# Development Plan — Leather Shop

Ordered by dependency, not by feature area — each phase unblocks the next.
References [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) (§),
[ARCHITECTURE.md](./ARCHITECTURE.md), and [USER_STORIES.md](./USER_STORIES.md)
(US-#). Everything before Phase 1 is already built (Next.js scaffold, cart,
checkout UI, order API shape, admin-notification email) — see the
"current vs. target" table in ARCHITECTURE.md.

## Decision points to resolve before/during the phases below

These block specific phases if left undecided — flagging up front instead
of discovering them mid-phase:
- **Category management** (fixed list vs. admin-editable) — affects the
  Phase 1 schema. Decide before writing the `products` table.
- **Return/exchange policy** (PRD §10, open question) — blocks finalizing
  FAQ content in Phase 7, not the schema/code.

## Phase 0 — Prep

No code dependencies; can start immediately.
- Create the Supabase project (account signup, project creation — external,
  can't be done for you).
- Draft Privacy Policy content (US-32). Do this early, not in Phase 7 —
  Google's OAuth consent screen verification (needed for Phase 4) requires
  a live privacy policy URL, so this is a blocker for admin auth, not just
  a content page.
- Add Supabase env vars to `.env.local` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`) per `.env.example`.

## Phase 1 — Database foundation

Unblocks everything else. Ref: ARCHITECTURE.md § Data Model.
- Resolve the category-management decision above; adjust schema accordingly.
- Write and run the schema migration: `products`, `product_variants`,
  `orders`, `order_items`, **`settings`** (shipping fee, delivery cities,
  admin notification email, order payment-hold duration — see
  ARCHITECTURE.md § Data Model; this is what makes "no hardcoded business
  configuration" in PRD §6/§7 real, not just a docs statement).
- Install `@supabase/supabase-js`; add `src/lib/supabase/server.ts`
  (service-role client, server-only — API routes and server components).
  No browser client yet — nothing consumes one until Phase 4 (auth) or
  Phase 8 (customer accounts), so it's deferred rather than built unused.
- Seed the two existing mock products (`classic-bifold-wallet`, `tote-bag`)
  into the real table so Phase 2 has something to render against. Seed
  `settings` with today's current hardcoded values as defaults (₱150
  shipping, the Metro Manila city list, the notification email, 48-hour
  hold) so behavior doesn't change the moment this phase ships.

**Exit criteria**: can query the `products` table from a script/route and
get the seeded rows back.

## Phase 2 — Storefront reads from Supabase

Ref: US-1 through US-5.
- Replace `src/lib/products.ts`'s hardcoded array with Supabase queries
  (`getProductBySlug`, `products` list — keep the same function signatures
  so calling code in `page.tsx`/`ProductDetail.tsx` doesn't need to change).
- Confirm category/price/in-stock filtering (US-1) still works against
  real data.

**Exit criteria**: `/products` and `/products/[slug]` render the seeded
Supabase data, not the old hardcoded array. Delete the hardcoded array once
confirmed.

## Phase 3 — Real order writes + stock logic

Ref: US-6 through US-14, US-23, US-24, US-25, US-25b.
- Replace `src/lib/orders.ts`'s in-memory array with Supabase writes
  (`orders` + `order_items` tables).
- `POST /api/orders` re-fetches product/variant rows from Supabase (not
  the old hardcoded product list) to validate and price the order, and
  reads shipping fee + delivery city list from **`settings`** instead of
  the hardcoded `SHIPPING_CENTAVOS`/`METRO_MANILA_CITIES` constants
  currently in `src/lib/orders.ts` / `src/lib/metro-manila.ts`.
- Implement stock decrement **at order placement** (US-24) against
  `product_variants.stock_quantity`; reaching 0 auto-flips status.
- Data model support for manually cancelling/restoring stock (US-25) — the
  actual admin UI button for this comes in Phase 5, but the underlying
  update needs to be possible now.
- **Auto-expiry (US-25b)**: a scheduled job (Vercel Cron hitting an
  API route, or Supabase `pg_cron` — per ARCHITECTURE.md/PRD §7) that reads
  `order_payment_hold_hours` from `settings` (default 48), finds orders
  still `pending_payment` past that many hours since `created_at`, flips
  them to cancelled/expired, and restores their `order_items`' stock
  quantities.

**Exit criteria**: place an order through the real checkout flow, confirm
the order row + order_items exist in Supabase and stock decremented by the
right amount, and that shipping fee/city validation match whatever's
currently in `settings` (not a code constant). Re-run the existing
validation test cases (bad city, sold-out variant, empty cart) against the
new Supabase-backed route. Separately, verify the expiry job: manually
backdate a test order's `created_at` past the configured hold duration,
run the job, confirm it cancels and restores stock — then change
`order_payment_hold_hours` in `settings` and confirm the job respects the
new value on the next run.

## Phase 4 — Admin auth

Ref: US-19. Depends on: Phase 0's Privacy Policy page existing.
- Configure Google OAuth in the Supabase Auth dashboard (needs the privacy
  policy URL from Phase 0).
- Implement the email allow-list check (env var or a small `admin_users`
  table) gating `/admin/*`.
- Add a login page/flow for `/admin` and route protection (middleware or
  per-page session check).

**Exit criteria**: logging into `/admin` with the owner's Google account
works; logging in with a different Google account is denied.

## Phase 5 — Admin catalog + order management UI

Ref: US-20 through US-28, US-25c. Depends on: Phase 1 (schema), Phase 4
(auth).
- Product CRUD UI: create/edit product fields, variants, price, lead time
  (US-21), ordering-enabled toggle (US-22), stock quantity (US-23, US-25).
- Photo upload to Supabase Storage, referenced by URL on the product/variant
  row (fills in the currently-empty gray placeholder box on the PDP).
- Order list UI: view incoming orders, mark paid (US-27), mark
  shipped/fulfilled (US-26).
- Basic sales overview: order count + revenue total (US-28) — a simple
  aggregation query, not a dashboard library.
- **Shop settings UI (US-25c)**: a form editing the `settings` table —
  shipping fee, delivery city list, admin notification email, and order
  payment-hold duration. This is the piece that actually delivers on
  "no hardcoded business configuration" (PRD §6/§7) — Phases 1–3 make the
  values live in the database, this phase is what lets the admin change
  them without touching code.

**Exit criteria**: can add a brand-new product entirely through `/admin`
(no code/DB console needed) and see it live on `/products`; can mark a
real test order as paid and shipped; can change the payment-hold duration
(e.g. 48 → 24 hours) through the settings UI and confirm the Phase 3
expiry job picks up the new value.

## Phase 6 — Complete the email loop

Ref: US-12, US-15. Depends on: Phase 3 (real orders exist to email about).
- Admin order-notification email already works (confirmed in earlier
  testing) — no change needed.
- Wire the **customer** confirmation email (order summary, total, next
  steps) — this exists in the PRD/architecture docs but was never actually
  implemented in `src/lib/email.ts`.

**Exit criteria**: placing an order sends both emails; verify with
`RESEND_API_KEY` set against a real test inbox, not just the console-warning
no-op path.

## Phase 7 — Content pages

Ref: US-29, US-30, US-31, US-32. Depends on: return/exchange policy decision
(for US-30) — everything else here is independent and could move earlier
if that decision is stalled.
- FAQ page, admin-editable (US-29, US-30) — needs a simple content store
  (a `faq_items` table, or a JSON column on a settings table — doesn't need
  its own relational model).
- Contact Us page (US-31) — static, Instagram + email links, low effort.
- Finalize Privacy Policy page content from Phase 0 (US-32).

**Exit criteria**: all three pages live and linked from site
navigation/footer; FAQ content editable from `/admin` without a deploy.

## Phase 8 — Customer accounts

Ref: US-16, US-17, US-18. Confirmed in scope for v1.
- Google/Facebook social login for customers (reuses the Supabase Auth
  setup from Phase 4, different consumer).
- Order history / status lookup (US-17) — query `orders` by the logged-in
  user's email.
- Saved addresses (US-18).

**Exit criteria**: a customer can log in, see their past orders, and reuse
a saved address at checkout.

## Phase 9 — Non-functional hardening

Ref: US-34, US-35, US-36; PRD §8. Can run in parallel with earlier phases
once there's a stable app to harden, but treat as a gate before calling v1
"done."
- Event logging (US-36): add to cart / checkout started / order placed
  events, logged somewhere queryable (structured console logs are enough
  for v1 — no analytics platform needed yet).
- SEO pass (US-35): metadata, sitemap, confirm product/category pages are
  crawlable.
- Accessibility pass: alt text on product photos, keyboard navigation for
  the clickable variant swatches, color contrast check.
- Mobile QA (US-34): manually verify the full flow (browse → cart →
  checkout) on a real mobile viewport, not just resize-the-desktop-window.

**Exit criteria**: Lighthouse (or equivalent) pass on mobile + accessibility
categories; full purchase flow completed on an actual mobile device/emulator.

## Phase 10 — v2: online payments

Ref: US-33; PRD §6 v2. Explicitly out of scope for v1 launch — start only
after Phases 1–9 are live and stable.
- Integrate PayMongo inside `POST /api/orders`: payment-intent creation at
  checkout, webhook handler to flip order status to `paid` automatically.
- This is the phase the whole API-layer boundary (ARCHITECTURE.md) was
  built to make low-effort — if it's turning into a rework, something
  drifted from the plan in an earlier phase.

**Exit criteria**: a real GCash/Maya payment through PayMongo's sandbox
flips an order to `paid` without manual admin intervention.
