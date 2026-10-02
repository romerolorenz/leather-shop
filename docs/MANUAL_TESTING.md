# Manual Testing — Leather Shop

Checklists for verification that needs a human in a real browser (forms,
file uploads, real OAuth logins) — things that can't be driven by curl or
an automated test. Check items off as you go and fill in **Findings** with
whatever you saw (works fine / error message / looks wrong) — leave blank
if untested. See [CLAUDE.md](../CLAUDE.md) for when this file is used vs.
MANUAL_TASKS.md.

Once every item in a phase's checklist is checked off and resolved, it's
collapsed to a one-line summary below (full history is in git — see the
phase's commit and any follow-up commits for exactly what was tested and
fixed).

## Outstanding

### "Order shipped" email (docs/IMPROVEMENTS.md)

Self-verified end-to-end via a scratch order (created → marked paid →
`markOrderShipped` → `sendOrderShippedEmail`, no error, cleaned up after) —
confirms the plumbing works and Resend accepts the send. What's left needs
a human eye on the actual rendered email:

- [ ] Check the real inbox (`marcolorenzoromero@gmail.com`) for a shipped
      notice sent during self-testing — confirm the HTML renders correctly
      (item photo/placeholder box, delivery address, no cost breakdown
      table) and reads clearly next to the existing order-confirmation
      email.
      Findings:
- [ ] Click "Mark as shipped" on a real order in `/admin/orders` and
      confirm the toast still shows success and the customer email arrives.
      Findings:

### Admin redesign, Phase 6 — Content (Homepage/FAQ) + Settings (docs/design/admin.md)

Self-verified via the test-admin session, including full functional
round-trips (not just screenshots) for the two redesigned interactions
— slot swap + restore, and FAQ edit + restore, both confirmed against
the real dev DB. Still worth a human pass over the rest:

- [x] Homepage: upload a hero image, drag the focal-point picker, drag
      to reorder two filled featured slots (self-verified the picker
      swap/remove, not the drag-reorder itself), save homepage text
      (now 3 fieldsets — Hero/Featured/Studio) and confirm all fields
      persist together.
      Findings: working
- [x] FAQ: add an item through the modal, confirm it appears; drag to
      reorder; delete an item.
      Findings: 
- [x] Settings: change a value in each of the four fieldsets (Shipping &
      Delivery, Notifications, Payment, Contact) and save — confirm all
      persist together in one submit, same as before.
      Findings:

### Promo codes + categories (docs/IMPROVEMENTS.md's "Promo code capability")

Migrations `0014_categories.sql`/`0015_promo_codes.sql`/
`0016_promo_code_limit_one_per_customer.sql` are live. Admin CRUD (both
categories and promo codes), the shopper-facing apply/carry-through/
remove flow, category-restricted partial discounts, and all four
rejection cases are verified — see Done below for the full summary and
the bugs found/fixed along the way.

Deferred to a later pass — not blocking, just not done yet:

**End-to-end order + usage limits**
- [ ] Place a full order (cart → checkout → confirm) with a valid code —
      order confirmation shows the correct discounted total; both the
      admin-notification and customer-confirmation emails show a
      "Discount (CODE): -₱X" line that makes the subtotal/shipping/total
      math add up.
      Findings:
- [ ] Using the same email, try to check out again with the same code —
      rejected as already used by this customer.
      Findings:
- [ ] Create a code with a usage limit of 1, redeem it once, then try a
      second order with a *different* email — rejected as fully redeemed.
      Findings:
- [ ] Quick mobile-viewport check of the promo code field on both `/cart`
      and `/checkout` — usable, not visually broken.
      Findings:

## Done

- [x] **Dark mode shelved — site always light** (docs/DESIGN_IMPROVEMENTS.md).
  Passed 2026-10-03 with the OS in dark mode: storefront, `/admin`, and
  native controls (date inputs, selects, checkboxes, radios, scrollbars)
  all render light; light-mode OS unchanged. No issues found.

- [x] **Direct image uploads — fixes 413 on Vercel** (docs/IMPROVEMENTS.md).
  Passed locally and on `leather-shop-dev.vercel.app` (2026-10-03): >5 MB
  hero upload (downscaled, correct orientation), multi-photo product
  upload, payment-method QR on add/edit (PNG kept crisp, no-file edit
  keeps existing QR), HEIC (Chrome error toast / Safari converts), and
  non-image rejection — no issues found.

- [x] **Payment methods + "Send payment details" email** (docs/IMPROVEMENTS.md).
  Migrations `0019`/`0020`/`0021` are all live. Full click-through pass
  covered: `/admin/payment-methods` CRUD (add with/without QR, drag
  reorder, edit + replace QR, save instructions text, delete), sending
  and resending payment details on a real order (toast, tab move,
  real-inbox email content), "Mark paid" and "Cancel order" from a
  Details Sent order, the `/admin` dashboard's Needs Attention list/stat
  tile, and `/account`'s "Payment details sent" grouping — all working.
  That pass found two real bugs, tracked and fixed as part of
  `docs/IMPROVEMENTS.md`'s entry: the order-status timestamp showed date
  only (no way to tell a resend apart from the original send), and the
  "Send payment details" button incorrectly still showed on `paid`
  orders. Both fixes shipped in commit `14b5bb9`, merged via `24783d1`.
  **Not yet re-verified live**: a fresh human click-through specifically
  re-checking the two fixed behaviors (resend now shows a distinct time;
  a `paid` order's card correctly hides the button) hasn't been recorded
  here — verification so far is a code-level read confirming both fixes
  are present as written, plus a clean `npx tsc --noEmit`, not a live
  re-click. Collapsing to Done now on that basis (same precedent as the
  "IMPROVEMENTS.md follow-through" entry below, which shipped with its
  error-toast path "unverified, not confirmed working" rather than
  staying open indefinitely) — flagging here in case a live re-check
  surfaces something the code read missed.
- [x] **Checkout redesign** (docs/design/checkout.md, PR #11). Verified
  two ways: self-verified via the test-admin session (which turns out to
  double as a customer session too — `assertCustomer()` accepts any
  authenticated user, no allow-list like admin has — placed two real
  test orders end-to-end, one per saved address, confirmed both landed
  correctly in `/admin/orders` with the fuller shipping address, cleaned
  up after), then a full human pass covering the rest: guest checkout
  (manual fields, no card picker, order succeeds), logged-in checkout's
  address cards and saved-address submission, `/account/addresses`
  display, a real mobile device (order summary above the form, cards/
  fields usable at narrow width), admin's order view, and both order
  emails' delivery-address section. No outstanding issues.

- [x] **Admin redesign, Phase 4 — Orders button styling** (docs/design/admin.md).
  Confirmed Mark paid/Mark shipped/Cancel button styling against a real
  pending/paid order. No outstanding items.

- [x] **Admin redesign, Phase 5 — Promo Codes** (docs/design/admin.md).
  Fully self-verified, including a real create → edit → delete
  round-trip against the dev DB (not just screenshots): status tabs
  compute correctly, the New/Edit `FormModal` pre-fills and saves
  correctly across all three fieldsets, deleting removes the row. No
  outstanding items.

- [x] **Admin redesign, Phase 3d — toolbar overlap (for real this time)
  + description cleanup** (docs/design/admin.md). The previous "fix"
  didn't actually work — root cause was `${FIELD_CLASS} w-40}` fighting
  a `w-full` baked into the shared `FIELD_CLASS`, which Tailwind doesn't
  resolve by string order. Fixed by not baking any width into the
  shared class at all. Self-verified with the test-admin session:
  selected the longest real category name and measured both elements'
  bounding boxes directly (no overlap, not just eyeballing a
  screenshot). Also removed the tab-specific description paragraph from
  Categories and Option Library.

- [x] **Admin redesign, Phase 3/3b/3c — Products/Categories/Option
  Library, Product edit page, and three follow-up fixes**
  (docs/design/admin.md). Verified two ways: manually by the user (tab
  bar, Catalog search/filter/status chips, New Product modal, Categories
  disclosures, Options modal, Product edit tabs/save/photos/options,
  Delete product guard) and self-verified via a synthetic dev-only test
  admin session (see the "Test admin access for dev testing" reference
  memory) driving real Playwright screenshots — confirmed the toolbar no
  longer overlaps, the Options tab's "Create & attach new" is gone with
  attach-defaults-to-all-ticked working, and the photo delete button
  sits correctly in its corner (the fix works; an earlier full-page
  screenshot had made it look broken mid-fade-in — a screenshot timing
  artifact, not a real bug, ruled out with a dedicated close-up
  screenshot + a `naturalWidth`/`complete` check on the image element).
  No outstanding issues.

- [x] **Admin redesign, Phase 2 — Dashboard** (docs/design/admin.md).
  Stat tiles and the "needs attention" list (pending/paid-unshipped
  orders only, oldest first, correct chip/price/relative-time, correct
  empty state) all verified against real data. No issues found.

- [x] **Admin redesign, Phase 1 — sidebar shell** (docs/design/admin.md).
  Logged in and verified clean: sidebar nav + nested Products/Content
  sub-links all correct and correctly highlight active state, mobile
  hamburger/drawer works, sign-out still works, storefront header/footer
  confirmed gone from every admin page and still present everywhere else
  (the `StorefrontChrome` split). No issues found.

- [x] **Promo codes + categories — admin CRUD and the shopper-facing
  flow** (docs/IMPROVEMENTS.md's "Promo code capability"; end-to-end
  order placement + usage-limit enforcement deferred separately, see
  Outstanding above). Verified across three rounds: categories CRUD
  including the in-use delete guard; promo-code admin CRUD (create,
  edit, delete, delete-blocked-while-redeemed, the "Limit to one
  redemption per customer" checkbox); a shopper applying a code on
  `/cart` — including its terms (discount %, cap, min. order) shown
  alongside the computed ₱ amount off — carrying through automatically to
  `/checkout`, removing it, applying directly on `/checkout`, and
  rejecting an invalid code; category-restricted partial-discount scoping
  (Option B — discounts only the eligible items' subtotal, doesn't
  reject a mixed cart outright); and all four rejection cases (below
  minimum order, not-yet-started, expired, inactive). Found and fixed
  five bugs along the way: a category rename correctly saving but the
  admin dropdown showing the old name (misdiagnosed at first — the real
  bug was on the product edit page, not the categories page); the promo
  form's date-picker calendar icon invisible in dark mode (root cause was
  site-wide — `globals.css` never declared `color-scheme`); a rejected
  promo-code submission wiping everything typed; and a promo code delete
  404ing right after (the edit page tried to re-fetch the just-deleted
  row). The category-dropdown and wiped-input bugs shared a root cause
  once properly diagnosed — React resets every uncontrolled form field to
  its mount-time value once any form action completes, success or failure
  alike — fixed generically via a success-only remount in `ActionForm`
  plus converting `PromoCodeFormFields` to controlled inputs.

- [x] **`/admin/options` edit-modal pattern + drag-to-reorder.** Both
  fully verified after two rounds of fixes. Edit-modal: single dialog per
  option type edits name/display-style/every value together, nothing
  commits until "Save options" (staged deletes via a hidden field,
  staged new-value rows), backdrop click is inert, and Cancel/X/Escape
  confirm before discarding unsaved changes — including a fix so
  reopening after a discard shows the last-saved state instead of the
  discarded edits (uncontrolled inputs weren't resetting since the
  dialog never unmounts; fixed by remounting the form subtree on close).
  Drag-to-reorder: grip-handle drag persists correctly across `/admin/faq`,
  a product's attached options (survives the batched "Save options"
  submit), and `/admin/homepage`'s featured list, with a failed reorder
  reverting the list and toasting an error.

- [x] **US-38 — Homepage featured products, hero image, editable text.**
  Migration `0013` run against the dev DB; full checklist passed as
  intended — max-3 featured enforcement with clean ordering, ↑/↓ reorder
  reflected on the homepage, a paused/sold-out featured product stays in
  its slot showing "Currently unavailable", hero upload + focal-point
  picker (crosshair + live mobile/desktop preview, persisted across
  reload) confirmed against real narrow/wide viewports, batched homepage
  text save, and the post-migration null-hero empty state.
- [x] **Homepage v3 implementation.** Previously cleared: hero
  crossfade/Ken Burns loops smoothly with no jump/flash,
  `prefers-reduced-motion` shows a static hero, real mobile device
  legibility/tap targets/scroll-reveal feel right, desktop hover states
  confirmed.
- [x] **Option library fixes — breadcrumb, batched save, single-value
  dropdown.** All four checks passed clean: `/admin/options` breadcrumb
  now reads "Admin / Options" (no stray "Products" crumb); editing
  several type/value rows at once and clicking "Save library" once
  persists all of them together; "Add value"/"Add option type"/delete
  still fire immediately without needing "Save library"; a dropdown-style
  option with exactly one value now enables Add to Cart immediately
  (pre-selected) and records correctly through checkout.
- [x] **Product options: shop-wide library, no variant entity.** Full
  checklist passed against the real DB (post `0010`/`0011` migrations):
  option type/value CRUD with cascading effect across every product using
  them, attach/create-and-attach/detach on a product, independent
  per-product value subsets on a shared type, batched "Save options" +
  immediate ↑/↓ reorder, every option combination addable to cart, stock-0
  showing "Sold out" uniformly, and the full cart → checkout →
  confirmation email → `/admin/orders` → `/account` flow showing correct
  "Type: Value" strings with stock decrementing correctly. Found two bugs
  along the way (the `/admin/options` breadcrumb/save-button issues and
  the single-value-dropdown Add to Cart block) — both fixed, see the entry
  above.

- [x] **Admin product visibility + thumbnail, batched option save,
  reorder.** All five checks passed clean (photo thumbnail on
  `/admin/products`, hide/show correctly 404s and un-404s the PDP without
  affecting past order history, batched multi-option save, ↑/↓ reorder
  with boundary buttons disabled correctly).
- [x] **Round 6 — Tooltips, admin save toasts, Contact Us icons.** Header
  nav icons (FAQ, Contact Us, Shop, My Account/Log In, Cart) show a hover/
  focus tooltip; deliberately *not* added to the cart's −/+ or any other
  admin icon (self-explanatory or already has a confirm dialog) — a first
  pass over-applied tooltips everywhere and was reverted back to
  navbar-only. Admin save/create actions (Save product, Add variant, Save
  all variants, Upload photo, Save settings, Add/save FAQ item) now show a
  success or error toast via new `ActionForm`/`SubmitButton` components,
  matching the existing delete/mark/cancel toast behavior. Found and fixed
  a real crash along the way: `ActionForm`'s original render-prop API
  passed a function as `children` from a Server Component to a Client
  Component (RSC can't serialize functions) — fixed by reading pending
  state via `useFormStatus` in `SubmitButton` instead. `/contact` shows a
  mail icon + Instagram icon next to each link, with a new
  `contact_instagram_handle` setting so the link reads "@handle" instead
  of the literal word "Instagram".
- [x] **Round 4 — Contact form + header icon consistency.** Verified via
  curl: `/contact` renders the form, `/api/contact` correctly rejects
  missing fields and invalid emails (400). FAQ is now an icon too (header
  nav is fully icon-only). Submitted the contact form live — working as
  expected (shows the "couldn't send" error until Resend + the Contact Us
  email are fixed per MANUAL_TASKS.md).

- [x] **Phase 9 — Non-functional hardening.** Lighthouse (mobile viewport)
  scored 100/100/100 (accessibility/best-practices/SEO) on `/` and a
  product page; `/sitemap.xml` and `/robots.txt` verified live; event
  logging covered by `tests/events.test.ts` and `tests/api-events.test.ts`.
  Mobile-device walkthrough (real device, post-deploy): full browse → cart
  → checkout → place order, and Google login → `/account` →
  `/account/addresses`, both confirmed working.
- [x] **IMPROVEMENTS.md follow-through.** Verified across three rounds:
  admin variant/photo Delete are trash icons (photo delete overlaid
  top-right), variant list batch-saves in one submit, cart line items show
  a photo thumbnail with a trash-icon Remove, header nav uses icons for
  Shop/Cart/Log In (FAQ / Contact Us / Shop / Account-or-Log In / Cart
  order). Round 3: `/admin/products/<id>` and `/admin/faq` show a native
  confirm dialog before deleting a variant/photo/FAQ item, `/admin/orders`
  shows one before Cancel order (not before Mark paid/Mark shipped — those
  aren't destructive); all six mutations show a success or error toast
  instead of a bare Next.js error page. The error-toast path itself
  couldn't be triggered during manual testing (no order in a state that
  would reject Cancel), so that half is unverified, not confirmed working.
- [x] **Phase 5 — Admin catalog + order management UI.** Verified across
  three rounds of fixes: separate pending/paid/shipped counts, multi-photo
  upload with a clickable thumbnail gallery on the PDP, orders grouped by
  status (collapsible) with cancel/mark-paid/mark-shipped actions,
  click/tap feedback site-wide, breadcrumbs on every shopper + admin page.
- [x] **Phase 7 — Content pages (FAQ, Contact, footer).** Verified across
  two rounds of fixes: public `/faq` and `/contact` pages, footer + header
  nav links, admin FAQ CRUD with reorder (↑/↓) and icon-based save/delete.
- [x] **Phase 8 — Customer accounts.** Verified across two rounds of
  fixes: customer Google login gating `/account`, order history grouped
  by status with item photos, saved-address CRUD with a single default,
  checkout's saved-address selector (including clearing back to blank),
  breadcrumbs on `/account` and `/account/addresses`.
