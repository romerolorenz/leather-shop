# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

Ordered by what it blocks.

- [x] *Blocks: nothing.* **"What happens next" copy on the order success
  screen** (manual testing finding, 2026-10-21). Add a line asking the
  shopper to give the shop time to process the order, and saying the
  payment instructions will follow, e.g. "Please give us a little time to
  process your order. We'll send your payment instructions as soon as we
  can." In `OrderPlaced` (`src/app/checkout/CheckoutForm.tsx`); update
  `docs/design/order-success.md` §7 to match. Fixed in release 0.2.0
  (2026-10-21).
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

- [ ] *Blocked by: the order-safety release on prod (MANUAL_TASKS).
  Blocks: nothing.* **Drop `decrement_product_stock()`.** Since migration
  `0026` the app places orders through `create_order()`, which decrements
  stock itself. `0026` keeps the old function so the code before that
  release keeps working between the migration and the deploy. Once the
  release is live on prod, add
  `drop function if exists decrement_product_stock(uuid, integer);` to the
  next migration and remove its row from
  `tests/db-function-permissions.test.ts`. Keep `restore_product_stock()`
  (the test cleanup helper uses it).

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

- [ ] *Blocks: nothing, but it protects real stock and the email quota.*
  **Bot and abuse protection on public forms** (from the 2026-10-17
  repo review). `/api/orders` and `/api/contact` have no rate limit or bot
  check. A script could hold every item's stock for the payment hold,
  make the shop email any address, or use up the Resend quota, after
  which real order notifications fail with only a log line. Options:
  Vercel BotID or Cloudflare Turnstile on checkout and contact, and/or a
  per-IP rate limit. Pair it with an admin-editable max quantity per order
  line in `settings` (not hardcoded).
- [ ] *Blocks: nothing.* **Keyboard (and touch) reordering for drag
  lists.** `src/components/admin/DragReorderList.tsx` uses native HTML5
  drag-and-drop, so it only works with a mouse: no ↑/↓ on a focused grip
  handle, and no dragging on phones. It drives every reorder list (FAQ,
  payment methods, product photos/options, homepage featured, and the
  category and product order on `/admin/categories`). The shop-order
  mockup (DESIGN_LOG.md, 2026-10-18) showed ↑/↓ on the focused handle;
  the build left it out because the brief said to keep the list's
  current interaction. Fix: make the grip a real `<button>` that moves
  its item up/down with the arrow keys and saves through the same
  `onReorder`, with a polite live-region announcement of the new
  position.
- [ ] *Blocks: nothing.* **Prevent a double order on a flaky connection**
  (repo review). If the response is lost after the server created the
  order, the shopper sees "Could not reach the server", resubmits, and
  holds stock twice. Fix: the client sends an idempotency key with the
  order, stored on `orders` with a unique constraint, and a retry returns
  the existing order.
- [ ] *Blocks: nothing.* **Fill test coverage gaps** (repo review):
  - `assertAdmin` actually rejecting a non-admin, and the `proxy.ts` admin
    gate (today they're only mocked);
  - the admin order actions (`cancelOrderAction`, `markOrderShipped`,
    `sendPaymentDetailsEmailAction`);
  - `getSalesSummary`.
  (The order races and the expiry sweep actually cancelling an order are
  now covered by the order-safety work, see completed/IMPROVEMENTS-archive.md.)
- [ ] *Blocks: nothing.* **Small cleanups from the reviews:**
  - `MAX_FEATURED = 3` is defined three times (`catalog.ts`,
    `admin/homepage/page.tsx`, `HomepageFeatured.tsx`), so the copies can
    drift. Use one shared constant.
  - `supabase/scripts/wipe_test_data.sql` has been stale since `0015`: its
    `delete from orders` hits the `promo_code_redemptions` foreign key.
  - `src/lib/supabase/server.ts` should `import "server-only"`.
  - "Try again" on location load errors (`AddressLocationFields.tsx:145`)
    is about 20px tall. Give it `inline-block py-3` for a 44px tap target.
  - The applied-promo box (`PromoCodeField.tsx:100`) is still `rounded-md`.
    Under the owner's "every rectangular element is 2px" rule it should be
    `rounded-btn` (owner to confirm).
  - Test hardening (optional): make `deleteOrdersRestoringStock`'s delete
    conditional on the status not being cancelled, and add guard unit tests
    for a shell-only variable and a shell-only `SUPABASE_PROD_REF`.

- [ ] *Blocks: nothing.* **Shop filters and category pages (rest of
  US-1)** (moved from the archived `docs/completed/USER_STORIES.md`,
  2026-10-18). The Shop page now groups products into category sections
  (`docs/design/shop-order.md`), but these were never built: filtering by
  category, price and availability (hide sold out), and a page per
  category (e.g. `/shop/wallets`). Only worth it once the catalog is big
  enough that scrolling the sections isn't enough. Needs a brief first.

## Done

Finished items are archived in [completed/IMPROVEMENTS-archive.md](./completed/IMPROVEMENTS-archive.md). Move items there once they're done.
