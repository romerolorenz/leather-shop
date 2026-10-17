# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

Ordered by what it blocks.

- [ ] *Blocks: nothing technically, but it affects real customers now
  that prod takes orders. Its migration will need dev + prod items in
  MANUAL_TASKS when built.*
  **Auto-expire only orders whose payment details were sent, counting
  the hold from the first send** (decided 2026-10-15). Today the daily
  sweep (`GET /api/orders/expire`, `src/app/api/orders/expire/route.ts`)
  cancels orders in **both** `pending_payment` and `payment_details_sent`,
  measuring the hold from `created_at`
  (`getExpiredPendingOrderIds()`, `src/lib/orders.ts:275`). That's unfair
  to the customer: they can't pay until the admin sends payment details,
  so a `pending_payment` order can expire before they were ever able to
  pay, and late-sent details shorten their window.
  - **New rule:** only `payment_details_sent` orders auto-expire.
    `pending_payment` orders are never auto-cancelled and stay until the
    admin sends details or cancels them by hand.
  - **Clock:** the hold (`settings.order_payment_hold_hours`, default 48)
    counts from when payment details were **first** sent. Resending
    doesn't restart it. That's deliberate, so a resend can't silently
    extend a deadline. `status_updated_at` can't be used for this,
    because `markPaymentDetailsSent()` refreshes it on every resend
    (`src/lib/orders.ts:450`–`468`).
  - **Needs:** a new nullable `orders.payment_details_first_sent_at
    timestamptz`. `markPaymentDetailsSent()` sets it only when it's null,
    on the `pending_payment` → `payment_details_sent` transition. The
    migration backfills it from `status_updated_at` for orders currently
    in `payment_details_sent`. Those are the only orders the sweep looks
    at. Their `status_updated_at` is the latest send, not the first, which
    is close enough for a one-time backfill. Closed orders can stay null.
    `getExpiredPendingOrderIds()` then filters
    `status = 'payment_details_sent'` and
    `payment_details_first_sent_at < now − hold`. Rename the function to
    match, e.g. `getExpiredAwaitingPaymentOrderIds`, and update the
    comment at `src/lib/orders.ts:272`.
  - **Side effects to handle:**
    - `pending_payment` orders now reserve stock indefinitely. The
      `/admin` dashboard's "Needs attention" list already surfaces them,
      but consider showing how old each one is, so stale ones get
      cancelled by hand.
    - Relabel `/admin/settings`' "Order payment hold (hours)" (`src/app/admin/settings/page.tsx:81`)
      with a hint like "after payment details are sent".
    - Update any customer-facing copy that implies a deadline from order
      placement. Check the payment-instructions text and the
      confirmation email.
    - Update PRD §5/§6 and docs/ARCHITECTURE.md § "Request flow: order
      expiry" to match.
  - **Tests:** update the expiry cases in `tests/orders.test.ts`. A
    `pending_payment` order older than the hold is **not** returned. A
    `payment_details_sent` order is returned only once
    `payment_details_first_sent_at` is past the hold. A resend doesn't
    move `payment_details_first_sent_at`.
  - **Rollout:** the migration runs on dev, then on prod before the
    release (MANUAL_TASKS.md tracks both).
  - Unchanged: the sweep still runs once a day at ~00:00 Manila (`0 16 * * *` UTC),
    so actual cancellation lands at the first midnight after the hold
    runs out.

- [ ] *Blocked by: the nationwide release on prod (MANUAL_TASKS).
  Blocks: nothing.*
  **Delete the unused `settings.delivery_cities` row.** Nationwide
  delivery (Done, 2026-10-17) stopped reading it, but migration `0025`
  deliberately leaves it in place. The code before that release reads it
  at checkout, and `supabase db push` applies every pending migration at
  once, so deleting it in the same release would break prod checkout
  between the migration and the deploy. Add
  `delete from settings where key = 'delivery_cities';` to the next
  migration written after the nationwide release is live on prod. It's
  one line and harmless until then.

- [ ] *Blocks: nothing.*
  **Audit the app for actions missing success/error feedback.** Per
  CLAUDE.md's new rule ("every user-triggered action gets visible
  feedback — never a silent success or a bare error page"), sweep both
  admin and customer-facing mutations for gaps and bring them in line
  with the existing `ActionForm`/`ActionButton` + `ToastProvider` pattern.
  Known candidate found while adding the rule: `PromoCodeField`'s
  "Remove" button (`src/components/PromoCodeField.tsx`) gives no toast —
  arguably fine since the discount line disappearing is itself immediate
  visual feedback (same precedent as the cart's quantity +/- and
  Remove-item buttons, which also don't toast), but worth a second look
  as part of this pass rather than assuming. Not started — no other
  candidates surveyed yet.

- [ ] *Blocks: nothing. Helps deliverability and customer replies.*
  **Set a Reply-To on customer emails** (logged 2026-10-17). The order
  confirmation, payment details and shipped emails are sent from
  `mail.hirayaleather.com`, which has no inbox, and have no Reply-To. Only
  the contact form sets one, to the shopper (`src/lib/email.ts:352`). A
  customer who hits Reply gets a bounce, and an unanswerable sender is a
  small spam signal. Set `replyTo` on customer-facing sends to the
  admin-editable `settings.contact_email`, so it isn't hardcoded. Test it
  in `email.test.ts`. Pair it with MANUAL_TASKS' "receiving address" and
  "stop shop emails landing in spam" items.

## Done

- [x] **Stop `npm test` from ever running against the production
  database** (2026-10-17): tests abort unless `.env.local` has
  `SUPABASE_ENV=dev` (`tests/setup/test-target.mjs`).

- [x] **Deliver nationwide (whole Philippines), with PSGC address
  dropdowns** (built 2026-10-17 on `feat/nationwide-delivery`, commits
  0c609be + 36d61bb; migration `0025` + PSGC seed run on dev and manually
  tested. **Not live yet:** waiting on the prod release in
  MANUAL_TASKS.md). Spec: `docs/design/checkout.md` §4.
  - Decisions (owner, 2026-10-15): one flat fee nationwide
    (`settings.shipping_fee_centavos`), and always nationwide with no area
    switch. That's a deliberate exception to "configurable by default",
    commented in `src/app/api/orders/route.ts`.
    `settings.delivery_cities` is no longer used; the row is deleted later
    (Outstanding).
  - Built: a bundled PSA PSGC 2Q 2026 snapshot seeded into `psgc_*`
    tables (refresh = re-seed, no migration; `supabase/psgc/README.md`).
    Shared `AddressLocationFields` cascading selects at checkout and in
    the account modal. Full address on cards, `/admin/orders` and all
    order emails. Manila keeps its numbered barangays, shown with their
    district ("Barangay 1 (Tondo I/II)").
  - Why codes + snapshotted names with no FK to `psgc_*`: a PSA refresh
    can't break order history. `resolveAddressCodes()` validates the chain
    server-side. Addresses without PSGC codes aren't offered at checkout
    (prod starts empty, so there's no legacy fix-up).

- [x] **Security: lock down execute permissions on older database
  functions** (fixed 2026-10-04, `fix/lock-down-db-functions`, migration
  `0024`, live on dev and prod). Stock and promo RPCs were callable by
  anon. That wasn't exploitable (SECURITY INVOKER + RLS default-deny), but
  one policy or `security definer` away from a hole. 0024 grants execute
  to `service_role` only and locks future functions by default.
  Trade-off: a function the browser or RLS must call needs an explicit
  grant. Test: `tests/db-function-permissions.test.ts`.

- [x] **Show short order refs (`#xxxxxxxx`) everywhere a person sees an
  order** (fixed 2026-10-03; follow-ups 2026-10-03/04). One helper,
  `formatOrderRef()` in `src/lib/order-ref.ts`. The 8-character length is
  hardcoded with an exception comment because it's a display format, not
  a business setting. Admin search ignores a leading `#`. The "Order ID:"
  footer was removed from the customer emails (redundant with the subject
  and heading). The confirmation email's payment note moved under the
  greeting and no longer says "Delivery is Metro Manila only." Checkout's
  Metro Manila address hint was later removed by nationwide delivery.

- [x] **Bug: image uploads over ~4.5 MB failed with `413` on Vercel**
  (fixed 2026-10-03). All admin image uploads now go browser → Supabase
  Storage directly via signed upload URLs, because Vercel Functions have a
  hard 4.5 MB body cap. Paths are re-validated server-side before saving.
  Client-side downscaling (`src/lib/image-resize.ts`) uses hardcoded
  parameters with an exception comment (technical, not a business
  setting).

- [x] **"Order shipped" email, matching the order-confirmation email's
  aesthetic.** `buildOrderShippedEmail()`/`sendOrderShippedEmail()`: same
  shell and item rows, no cost table. It's sent from
  `markOrderShippedAction` with a swallowed error, so an email hiccup
  can't undo the status change. Options are listed one per line in both
  emails. (Its "Order ID:" footer was later removed; see Short order
  refs.)
- [x] **Admin-triggered "payment details" email, with admin-editable
  payment info, plus order-status tracking** (scoped 2026-07-20;
  migrations `0019`–`0021`; commit `14b5bb9`, merged via `24783d1`).
  "Send payment details" on `/admin/orders` emails the shop-wide payment
  methods (`/admin/payment-methods`) and the instructions text.
  - Manual, per-order trigger, resendable any time: the admin decides
    when to send.
  - QR is per payment method, not one shared image. One flat list,
    because the bank vs. e-wallet split wasn't needed (`0020`).
  - Why `payment_details_sent` is a real status (`pending_payment` →
    `payment_details_sent` → `paid` → `shipped`) with one shared
    `status_updated_at`: one column instead of one per event. A resend
    only refreshes the timestamp and never moves the status backward.
    Expiry currently treats it like `pending_payment` (changing; see the
    expiry rule in Outstanding).
  - Manual testing found two bugs, both fixed: the status timestamp now
    shows the time, and the send button no longer shows on `paid`
    orders.
- [x] **"Product Details" section on the storefront product page**
  (migration `0017`). Optional `dimensions`/`details` fields. They're
  edit-page only, matching the pattern where quick-create defers
  secondary fields. The section shows only when one of them is set.
- [x] **Pre-select the first value for "buttons"-style product options, not
  just dropdowns**, so "Add to cart" isn't blocked until an explicit
  click.
- [x] **Checkout order summary: list each item's selected options one per
  line, not comma-joined in parentheses** (matches the cart, emails and
  `/admin/orders`).
- [x] **Show a toast when an item is added to cart** (via the app-wide
  `useToast()`).

- [x] **`/admin/options` uses an edit-modal pattern instead of inline
  batch-editable fields.** One dialog per option type. Nothing commits
  until "Save options", and deletes are staged too. Why it's hard to
  dismiss (inert backdrop; Cancel/X/Escape confirm if anything changed):
  real edits could otherwise be lost.
- [x] **Drag-to-reorder instead of ↑/↓ buttons**, across `/admin/faq`,
  product options and homepage featured (`DragReorderList`). It uses a
  dedicated grip handle, so inputs inside rows stay usable.
- [x] Homepage content management (US-38): migration `0013`. Up to 3
  featured products, a standalone hero image with a focal-point picker,
  and six editable text settings. The hero is deliberately not one of the
  3 featured products.
- [x] **Promo code capability** (scoped 2026-07-19; migrations
  `0014`–`0016`). Customer codes on both `/cart` and `/checkout` (either
  can be the last stop before payment), with admin CRUD for codes and
  categories. **Still deferred:** the 4 end-to-end order and usage-limit
  checks in MANUAL_TESTING.md's "Promo codes + categories".
  - Shape: % off the eligible merchandise subtotal with an admin cap,
    never shipping. One code per order; a new code replaces the old one.
  - Category scope, Option B: the code applies if any cart item is
    eligible, and discounts only those items. Why: a mixed cart shouldn't
    be rejected outright. The minimum order checks the whole cart.
  - Usage limits: per customer, a total cap and a date range, enforced
    via `promo_code_redemptions` and an atomic `redeem_promo_code()`.
    `limit_one_per_customer` (`0016`) lets a publicly shared code be
    reused.
  - Categories were normalized into a real table so promos have something
    validated to reference. Internal-only: no storefront category
    browsing.
  - Applied codes carry from cart to checkout and are re-validated
    silently. Orders snapshot `discount_amount`, so editing a code doesn't
    rewrite history.
- [x] Fixed a dropdown-style option with only one value permanently blocking
  Add to Cart — `ProductDetail.tsx`'s `selectedOptions` started empty and
  relied on `<select>`'s `onChange`, which never fires when there's only one
  `<option>`. Now seeded from each dropdown option's first value instead.
- [x] Fixed `/admin/options`'s breadcrumb (stray "Products" crumb left over
  from copying `/admin/products/page.tsx`) — now just `Admin / Options`.
- [x] `/admin/options` saves the whole library in one submit
  (`updateOptionLibraryAction`) instead of a save button per row, matching
  the per-product options pattern; create/delete stay immediate single-row
  actions.
- [x] Admin → Products (US-41): `products.visible` toggle to hide a product
  from the shop entirely (migration `0012`); Options section batches
  selection saves into one submit and gained ↑/↓ reorder.
- [x] Admin → Products list shows each product's photo thumbnail.
- [x] Dropped the variant entity — any combination of a product's option
  values is orderable without an admin-created variant row (migration
  `0011`); selected options snapshot onto the order directly
  (`order_item_options`) instead of via `variant_id`. See
  [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md).
- [x] Shop-wide reusable option library (US-40) — option types/values
  defined once (`option_types`/`option_values`) and attached to any product
  via `/admin/options`, same migration `0011`. See
  [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md).
- [x] Product options beyond color (US-39) — admin-configurable option
  types per product with swatch/dropdown display style, single
  production-capacity stock per product rather than per variant/combination
  (migrations `0009`/`0010`). See
  [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md).
- [x] Icon-only controls got hover/focus tooltips (`Tooltip.tsx`, pure CSS),
  later narrowed to the header navbar only. Cart's −/+ quantity buttons were
  deliberately left untooltipped — self-explanatory glyphs, a tooltip was
  noise.
- [x] Contact Us page shows email + Instagram icons with the real handle
  instead of the word "Instagram"; added a configurable
  `contactInstagramHandle` setting (migration `0008`).
- [x] Admin save actions (save product, add/save variants, upload photo,
  create product, FAQ, settings) now show a success toast via new
  `ActionForm`/`SubmitButton` components, matching delete/mark/cancel
  actions.
- [x] Customer-facing order history (`/account`) and saved addresses
  (`/account/addresses`) — US-18, shipped as part of Phase 8.
- [x] Admin → Products: variant list and product photo Delete are trash
  icons instead of text, matching FAQ/addresses.
- [x] Admin → Products: variant list saved all rows in one submit instead
  of one form per variant.
- [x] Cart page: each line item shows a photo thumbnail (placeholder
  fallback for pre-existing localStorage carts) and Remove is a trash icon.
- [x] Header nav: Shop/Cart are icons instead of text (Cart keeps its
  item-count badge); footer stays text-only. Log In is an icon too,
  matching the rest of the nav regardless of auth state.
- [x] Admin: delete variant/photo/FAQ item and cancel order show a native
  `window.confirm()` prompt first; those plus mark paid/mark shipped show a
  toast on success or thrown error (new `ActionButton` component).
