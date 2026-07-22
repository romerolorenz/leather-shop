# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

- [ ] **Use PSGC (Philippine Standard Geographic Code) data for
  region/city/barangay address fields, instead of the current flat
  admin-typed city list.** Today's address model is much simpler:
  `customer_addresses`/orders only store free-standing `street` + `city`
  text columns (`src/lib/customer/addresses.ts`), and `city` is validated
  against `settings.deliveryCities` — a flat admin-editable string array
  (`src/lib/settings.ts`, key `delivery_cities`) rendered as a plain
  `<select>` in `AddressFormModal.tsx` and `CheckoutForm.tsx`. There's no
  region or barangay concept anywhere in the schema. This replaces that
  with real PSGC-sourced reference data (region → province/HUC → city/
  municipality → barangay) so address entry becomes cascading
  region/city/barangay dropdowns instead of one hand-maintained flat
  list.
  - **Phase 1 scope**: NCR only, matching the current Metro-Manila-only
    delivery area — the region level may not even need a selector yet if
    it's a single fixed value, but city and barangay should be real PSGC
    entities for NCR's cities/municipalities from day one so the later PH
    expansion doesn't need a data-model rework, just more rows.
  - **Expandable to PH**: the schema (likely a `psgc_regions`/
    `psgc_cities`/`psgc_barangays` reference table set, seeded from the
    published PSGC dataset) should support the full hierarchy nationwide
    even though delivery is currently NCR-only — `settings.deliveryCities`
    (or its replacement) then becomes "which PSGC city codes are
    deliverable" rather than a free-typed list, so opening a new delivery
    area later is admin config, not a schema change.
  - **Touches**: `customer_addresses` + orders' shipping-address columns
    (add region/city/barangay code references, likely alongside or
    replacing the plain `city` text), `AddressFormModal.tsx` and
    `CheckoutForm.tsx`'s city `<select>` (become cascading selects), admin
    delivery-area configuration (`/admin/settings`'s delivery cities
    field), and anywhere shipping address is displayed (`/admin/orders`,
    order confirmation emails, `/account/addresses`).
  - Not scoped in detail yet — needs a data-source decision (bundling a
    PSGC dataset snapshot vs. an API) and a proper migration plan before
    building.
- [ ] **Admin-triggered "payment details" email, with admin-editable
  payment info.** Scoped via user Q&A on 2026-07-20; not designed/built
  yet. Today `src/lib/email.ts`'s order confirmation just says "we'll
  reach out shortly with payment instructions (bank transfer / GCash /
  Maya)" — the actual account/QR details live nowhere in the app, handled
  entirely off-platform. This replaces that gap with a real, admin-
  editable email.
  - **Trigger**: manual, per-order — a new "Send payment details" action
    on `/admin/orders` alongside the existing `markOrderPaidAction`/
    `markOrderShippedAction`/`cancelOrderAction` (`src/app/admin/actions.ts`
    lines 365-384), not automatic on order placement. Admin decides when
    to send it (e.g. after manually reviewing the order), can presumably
    resend if needed.
  - **Content, all admin-editable and shop-wide (same for every order,
    not per-order)**:
    - Multiple bank transfer entries (bank name, account name, account
      number) — a list, not a single fixed set of fields.
    - Multiple e-wallet entries (e.g. GCash/Maya — provider label,
      account name, number) — also a list.
    - One uploadable QR code image, shown in the email.
    - One free-form instructions text block (deadlines, reference-number
      format, anything else) — same "admin discretion" pattern as the
      Product Details free-text field above.
  - **Data model**: since bank/e-wallet entries are variable-length lists
    (not single values), this doesn't fit the plain `settings` key-value
    table — needs a proper `payment_methods` table (id, type: `'bank' |
    'ewallet'`, account_name, account_number, label, position for
    ordering) with admin CRUD, likely a new `/admin/payment-methods` page
    following the `/admin/options` list pattern. The QR image and
    free-form text fit as two `settings` keys instead (`paymentQrImageUrl`
    — upload following `HeroImagePicker.tsx`'s pattern into the existing
    `site-images` bucket; `paymentInstructionsText`).
  - **Email**: new `buildPaymentDetailsEmail()` in `src/lib/email.ts`
    (alongside `buildOrderConfirmationEmail`/`buildOrderNotificationEmail`),
    pulling the bank/e-wallet list + QR image + instructions text at
    send-time (not snapshotted), sent via the existing `sendEmail`/Resend
    helper. New `sendPaymentDetailsEmailAction(orderId)` bound per-row in
    `/admin/orders`, `ActionButton`-wrapped for the existing toast-on-
    success/failure convention.
- [ ] **Audit the app for actions missing success/error feedback.** Per
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
- [ ] **Promo code capability.** Customer-entered discount codes, applicable
  on both the cart page and the checkout page (same code field/validation
  logic reused in both places, since either can be the last stop before
  payment). Scoped via user Q&A on 2026-07-19; code complete, migrations
  `0014_categories.sql`/`0015_promo_codes.sql` run against the dev DB.
  Built: `categories` + `promo_codes`/`promo_code_categories`/
  `promo_code_redemptions` tables, atomic `redeem_promo_code()` Postgres
  function, `src/lib/promo-codes.ts` (admin CRUD + validatePromoCode),
  `/admin/categories` + `/admin/promo-codes` admin UI, `POST
  /api/promo-codes/apply` (cart/checkout preview) and `POST /api/orders`
  (final atomic redemption), shared `PromoCodeField` component on both
  the cart and checkout pages, discount line added to both order emails.
  Automated tests (`categories.test.ts`, `promo-codes.test.ts`,
  `api-promo-codes-apply.test.ts`, `api-orders-promo.test.ts`) pass
  clean against the live dev DB (66/66 real tests; found and fixed two
  test bugs — a silently-swallowed FK violation from inserting a
  redemption row against a nonexistent order, and a hardcoded shipping
  fee assumption that didn't match the dev DB's actual
  admin-configured value). Core cart→checkout→order flow additionally
  verified via an automated headless-browser run (see
  `docs/MANUAL_TESTING.md`). First real manual-testing pass (2026-07-20)
  found and fixed four bugs plus one feature request:
  - Renaming a category saved correctly but the input reverted to showing
    the old name (uncontrolled-input `defaultValue` doesn't re-apply on
    re-render) — fixed by keying the input on the name so it remounts
    when it changes.
  - The promo-code form's date-picker calendar icon was invisible in dark
    mode — root cause was site-wide (no `color-scheme` declared in
    `globals.css`, so every native form control assumed light mode); fixed
    at the root rather than just the date inputs.
  - A failed promo-code creation (validation error) wiped everything the
    admin had typed instead of preserving it — root cause was
    `PromoCodeFormFields` being plain server-rendered JSX inside the page,
    so every Server Action round-trip regenerated it from scratch with
    blank defaults; fixed by making it a Client Component so its inputs
    survive the parent Server Component's re-render.
  - Deleting a promo code from its own edit page 404'd right after
    (Server Actions always trigger a refresh of the current route, and
    the just-deleted row no longer resolves) — fixed by navigating to the
    list page on success (new `onSuccess` hook added to `ActionButton`).
  - Feature request: an admin-facing option to exempt a code from the
    one-redemption-per-customer rule (e.g. a code shared publicly that
    anyone can reuse) — added `promo_codes.limit_one_per_customer`
    (migration `0016`, default true so existing codes are unaffected),
    threaded through `redeem_promo_code()`, `validatePromoCode()`, and the
    admin form. The total usage cap still applies regardless of this
    setting.

  Still needs a second manual pass — see `docs/MANUAL_TESTING.md`'s
  "Promo codes + categories" checklist — before moving to Done: re-verify
  the five fixes above, plus the not-yet-tested items (remove/re-apply a
  code, category-restricted partial discount and rejection cases in an
  actual browser, real inbox check for the email discount line, and a
  mobile-viewport look).
  - **Discount shape**: percentage off the *eligible* subtotal (see
    category scope below), with an admin-set cap (max discount amount) —
    e.g. "20% off, up to ₱500 off." Not a flat amount-off or free-shipping
    code, at least for v1. Applies to merchandise subtotal only, never
    the flat ₱150 shipping fee.
  - **Eligibility**: admin-set minimum order value (checked against the
    *whole* cart subtotal, regardless of category restriction — a
    category-restricted code still needs the full order to clear this
    bar), and optionally restricted to specific product categories (see
    categories work below). A code with no category restriction applies
    to the whole order.
  - **Category scope, resolved 2026-07-19 (Option B)**: a category-
    restricted code applies as soon as at least one cart item is in an
    eligible category — it does NOT require the whole cart to match. The
    discount is computed only on the eligible items' subtotal, not the
    whole order; unrelated items in the same cart are charged in full and
    unaffected. Example: cart has a Tote (Bags, ₱4,299) + a Card Wallet
    (Wallets, ₱999); a "20% off Bags" code applies 20% to just the ₱4,299,
    the Wallet pays full price. The checkout/cart summary must therefore
    label the discount line as scoped (e.g. "Promo (Bags items only)")
    rather than implying it's off the whole order.
  - **Usage limits, all three enforced together**: one redemption per
    customer (by account/email), a total redemption cap across all
    customers, and a start/end expiration date range. Needs a
    `promo_code_redemptions`-style table (code, customer, order,
    redeemed-at) to check the per-customer and total-cap rules, not just a
    counter column.
  - **Stacking**: one promo code per order — entering a new code replaces
    any previously applied one, no combining multiple codes' discounts.
  - **Persistence, resolved 2026-07-19**: applying a code on the cart page
    carries through automatically to checkout (stored alongside the cart,
    same localStorage-backed mechanism), re-validated silently in the
    background rather than requiring re-entry.
  - **Admin authoring**: manually created one at a time via an admin form
    (code, discount %, cap, min order value, category restriction, usage
    limits, expiration) — no bulk/random-batch code generation for v1.
  - **Prerequisite — normalize product categories first**: today
    `products.category` (`supabase/migrations/0001_init.sql`) is a free
    -text, unvalidated column (confirmed no `categories`/`tags` table
    exists anywhere in `supabase/migrations/`, and `src/app/products/page.tsx`
    doesn't group/filter by it at all). Promo-by-category needs a real,
    validated `categories` entity (id, unique name) that products reference
    by FK instead of a raw string, with admin CRUD/validation for the list
    of categories. **Explicitly scoped as internal-only**: this does *not*
    include adding category browsing/filtering/grouping to the storefront
    shop page — that stays a flat product grid exactly as it is today; the
    normalized categories exist purely so promo codes (and future admin
    tooling) have something real to reference instead of a typo-prone
    string.
  - **Data model sketch** (not final — write an actual migration when this
    is picked up): `categories` (id, name unique), `products.category_id`
    FK replacing `products.category` text, `promo_codes` (id, code unique,
    discount_percent, max_discount_amount, min_order_value, usage_limit_total,
    starts_at, expires_at, active), `promo_code_categories` join table
    (promo_code_id, category_id) for the optional restriction, and
    `promo_code_redemptions` (promo_code_id, customer identifier, order_id,
    redeemed_at) for usage-limit enforcement. Orders need a nullable
    `promo_code_id` + a snapshotted `discount_amount` so past orders keep
    showing the discount that actually applied even if the code is later
    edited/deactivated.

## Done

- [x] **"Order shipped" email, matching the order-confirmation email's
  aesthetic.** New `buildOrderShippedEmail()`/`sendOrderShippedEmail()`
  (`src/lib/email.ts`) — same HTML shell/tokens as
  `buildOrderConfirmationEmail` (Arial-stack, `max-w:560px` card, item
  photo rows with placeholder fallback, delivery-address block, `Order
  ID: …` footer), but shipped-specific headline/copy and no cost
  breakdown table. New `getOrderById(orderId)` in `src/lib/orders.ts`
  (same `ORDER_SELECT`/`mapOrderRow` plumbing as the list-returning
  lookups) since `markOrderShipped` only touches the `status` column.
  Wired into `markOrderShippedAction` (`src/app/admin/actions.ts`) right
  after the status update succeeds, wrapped in try/catch/log-and-swallow
  (same pattern as the two sends in `POST /api/orders`) so an email
  hiccup can't undo the status change or fail the admin's success toast.
  Selected product options are shown per item, one per line — both
  emails' HTML (small gray text under the item name) and shared text
  builder (indented lines) were updated together with the confirmation
  email to match, since they'd shared the older comma-in-parentheses
  format and this was the same one-per-line convention just applied to
  the checkout page. New tests: `buildOrderShippedEmail`/
  `buildOrderConfirmationEmail` cases in `tests/email.test.ts` (photo
  embed, placeholder fallback, HTML-escaping, no cost breakdown,
  one-option-per-line in text and HTML) and a `getOrderById` case in
  `tests/orders.test.ts` (full order for a real id, `null` for a missing
  one) — all pass clean; full `npm test` otherwise unaffected (75
  passed, only the two pre-existing unrelated seed-data failures).
  Live-verified end-to-end via a scratch order (create → mark paid →
  `markOrderShipped` → `sendOrderShippedEmail`) — status flips correctly
  and Resend accepts the send with no error, sent to the account owner's
  inbox (sandbox sender restriction); a second scratch order with two
  option values confirmed both text and HTML list them one per line, not
  comma-joined. Actual rendered-email look and a real click-through of
  "Mark as shipped" in `/admin/orders` need a human pass — see
  `docs/MANUAL_TESTING.md`.
- [x] **"Product Details" section on the storefront product page.** Two
  new nullable `products` columns (`dimensions text`, `details text`,
  migration `0017_product_details.sql`, run against the dev DB), both
  optional and independent. Wired through the usual four spots
  (`src/lib/products.ts`'s `ProductRow`/`PRODUCT_SELECT`/`Product`/
  `mapRow`) plus the admin equivalents in `src/lib/admin/catalog.ts`
  (`AdminProductRow`/`ADMIN_PRODUCT_SELECT`/`AdminProduct`/`mapAdminRow`/
  `ProductInput`/`createProduct`/`updateProduct`). New "Dimensions &
  weight" (short text) and "Details" (textarea) fields added to
  `ProductFormFields.tsx` — edit-page only, matching the existing pattern
  where the quick-create modal (`ProductsCatalog.tsx`) defers secondary
  fields to the edit page. `ProductDetail.tsx` renders a "Product
  Details" section after the description block, only when at least one
  field is set. New `products.test.ts` cases (defaults to null,
  round-trips through `createProduct`/`updateProduct`, clears back to
  null) pass clean against the live dev DB. Verified end-to-end via a
  synthetic-admin-session Playwright run: filled both fields on
  `/admin/products/<id>`, saved, confirmed the section rendered
  correctly on the storefront PDP, then cleared the scratch data back
  to null.
- [x] **Pre-select the first value for "buttons"-style product options, not
  just dropdowns.** `ProductDetail.tsx`'s `selectedOptions` now seeds
  `type.values[0]` for every option type regardless of `displayStyle`,
  instead of only `"dropdown"` — a buttons-style option's first value now
  renders pressed/highlighted by default and no longer blocks "Add to
  cart" until an explicit click. Verified live: `/products/heritage-messenger-bag`
  (Size + Color both buttons-style) loaded with both pre-selected and Add
  to cart already enabled.
- [x] **Checkout order summary: list each item's selected options one per
  line, not comma-joined in parentheses.** `CheckoutForm.tsx`'s order
  summary now renders each `selectedOptions` entry as its own line under
  the item name/qty (matching the cart page, order confirmation email,
  and `/admin/orders`) instead of one comma-joined string in parentheses;
  dropped the now-unused `formatSelectedOptions` import. Verified live: a
  3-option cart item (Thread Color/Size/Color) showed three separate
  lines on `/checkout`.
- [x] **Show a toast when an item is added to cart.** `ProductDetail.tsx`'s
  `handleAddToCart` now calls `showToast({ type: "success", message: "Added
  to cart" })` (from the existing app-wide `useToast()`) right alongside the
  pre-existing `justAdded` label swap and the cart badge's passive
  increment — no server-action plumbing needed since `showToast` has no such
  dependency. Verified in a live dev-server run (product page → select a
  swatch option → Add to cart): toast, button label, and cart badge all
  update together with no console errors.

- [x] **`/admin/options` uses an edit-modal pattern instead of inline
  batch-editable fields**, matching `/account/addresses`
  (`AddressFormModal.tsx`)'s trigger/dialog structure (though not its
  backdrop-click-to-close or immediate-delete behavior — see below,
  changed after manual testing). The main list shows each type read-only
  (name, display style, comma-separated value preview) with a single
  pencil "Edit" button; that opens one dialog (`OptionTypeFormModal.tsx`)
  covering the whole type — name, display style, every value's text, and
  a "+ Add value" button for new ones. Nothing commits until "Save
  options": removing an existing value only stages it (hidden
  `deleteValue` field), so the actual delete happens inside
  `updateOptionTypeAction(id, existingValueIds, prevState, formData)`
  alongside the renames/creates, same as "+ Add value" rows were already
  staged client-side. This replaced the old batched
  `updateOptionLibraryAction`, the per-value
  `createOptionValueAction`/`updateOptionValueAction`, and the instant
  `deleteOptionValueAction`. Because real edits can now be lost, the
  dialog is deliberately hard to dismiss by accident: the backdrop is
  inert (no click-outside-to-close), and Cancel/X/Escape all confirm
  first if anything changed. It still submits through `useActionState`
  (not `AddressFormModal`'s `onSubmit={close}`) so a thrown error toasts
  and keeps the dialog open instead of closing before the action
  resolves; creating/deleting a whole option type on the main page is
  unchanged.
- [x] **Drag-to-reorder instead of ↑/↓ buttons**, across `/admin/faq`,
  `/admin/products/[id]`'s Options section, and `/admin/homepage`'s
  featured list. New generic `DragReorderList`
  (`src/components/admin/DragReorderList.tsx`) uses native HTML5 drag
  events with a dedicated grip handle (not the whole row, so inputs/
  textareas/buttons inside each row stay usable) and calls back with the
  full dropped order. The swap-adjacent functions (`moveFaqItem`,
  `moveProductOption`, `moveFeaturedProduct`) were replaced with
  set-full-order equivalents (`reorderFaqItems`, `reorderProductOptions`,
  `reorderFeaturedProducts`) via a new `setPositions` helper alongside the
  existing `swapPositions` one in `src/lib/admin/reorder.ts`.
- [x] Homepage content management (US-38) — live: migration `0013` run
  against the dev DB, admin UI manually verified end-to-end (see
  `docs/MANUAL_TESTING.md`).
  - **Featured products**: `products.featured` + `featured_position` (max
    3, enforced in `setProductFeatured`), toggle + ↑/↓ reorder from the new
    `/admin/homepage` page. The hero image is deliberately *not* one of the
    3 — it's a fully standalone concept (see below), so "featured" now
    means only the up-to-3-product grid.
  - **Hero image**: standalone upload (new `site-images` bucket), not tied
    to any product's photos. Click-to-set focal-point picker
    (`HeroFocalPointPicker.tsx`) with live preview at both mobile (9:16)
    and desktop (16:9) aspect ratios, applied via `object-position` on the
    real hero.
  - **Editable text**: hero eyebrow/headline, featured section
    eyebrow/heading, studio heading/body — six new `settings` keys, one
    batched save form matching `/admin/settings`.
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
