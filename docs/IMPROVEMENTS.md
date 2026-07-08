# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

(none — see Done below)

## Done

- [x] **Bug fix: a dropdown-style option with only one value permanently
  blocked Add to Cart.** Found during manual testing (MANUAL_TESTING.md,
  "Product options: shop-wide library" checklist). In
  `src/app/products/[slug]/ProductDetail.tsx`, `selectedOptions` state
  started empty and only ever got populated via a `<select>`'s
  `onChange` — which a native `<select>` never fires when it has just one
  `<option>` (there's no other value to change to), so the required
  selection could never be satisfied. Fixed by seeding
  `selectedOptions`'s initial state with each dropdown-style option
  type's first value (matching what the browser already shows visually
  by default) instead of starting empty; multi-value dropdowns and the
  `buttons` display style are unaffected. Verified via a temporary
  product's server-rendered PDP (the Add to Cart button carried a
  `disabled` attribute before the fix and did not after, with the
  dropdown's sole option pre-selected) and confirmed live end-to-end
  (checkout records the value correctly) — see `MANUAL_TESTING.md`.
- [x] **Fixed `/admin/options`'s breadcrumb, which read
  "Admin / Products / Options" with a "Products" crumb linking to
  `/admin/products`.** The route itself was correct
  (`src/app/admin/options/page.tsx` is `/admin/options`, not nested under
  products) — the bug was a stray middle crumb in the page's hardcoded
  `Breadcrumbs` array, left over from copying `/admin/products/page.tsx`'s
  array. Now just `Admin / Options`.
- [x] **`/admin/options` now saves the whole library in one submit
  instead of a separate save button per option type/value row.** Matches
  the pattern already used for per-product option selections (`Save
  options`, see below). All type-name/display-style and value-text
  inputs now live inside one `ActionForm` (`updateOptionLibraryAction` in
  `src/app/admin/actions.ts`, bound with every rendered type/value id,
  same binding style as `updateProductOptionSelectionsAction`); one
  "Save library" submit updates every changed row in one round trip.
  Create ("Add value", "Add option type") and delete stay immediate,
  single-row actions, same as attach/detach/create already are on the
  per-product Options section — only the *edit* actions were batched.
  "Add value" couldn't stay an `ActionForm` once nested inside the outer
  save-library form (nested `<form>` elements are invalid HTML), so it
  now uses a new `<form>`-free `src/components/admin/InlineAddForm.tsx`
  (same direct-call-the-action approach as `ActionButton`, just with a
  text field). Verified live in a real admin session — see
  `MANUAL_TESTING.md`.

- [x] **Admin → Products: hide a product from the shop entirely, plus a
  batched option-selection save and reorderable options (US-41).**
  `products.visible` (migration `0012_product_visibility.sql`, default
  true) — a new "Visible in shop" checkbox on the product form; unchecking
  it excludes the product from `getProducts()` (listing + sitemap) and
  404s its PDP directly, but `getProductBySlug()` still resolves it
  (order history/photos for past orders of a since-hidden product still
  render). Distinct from the existing "Ordering enabled" pause, which
  still lists the product as unavailable. Also: the product page's Options
  section now saves every attached option's value selection in one submit
  (`updateProductOptionSelectionsAction`) instead of one form per option,
  and gained ↑/↓ reorder buttons (`moveProductOption`, same swap-adjacent-
  position approach as `moveFaqItem`) — both routed through `ActionButton`
  rather than a nested `<form>`, since they live inside the batch-save
  form.
- [x] **Admin → Products list: show each product's photo thumbnail.**
  `/admin/products` now renders the first product photo (or a placeholder
  box) beside each row, matching the cart/PDP thumbnail pattern.
- [x] **Drop the variant entity — any combination of a product's option
  values should be orderable, no admin-created variant row required.**
  See [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md)'s "Second
  course correction" section. `product_variants`/`product_variant_options`
  are gone (migration `0011_option_library_and_order_item_options.sql`,
  not yet run against the live DB — see MANUAL_TASKS.md); selected options
  are recorded on the order directly (`order_item_options`, snapshotted)
  instead of via a `variant_id` FK. The PDP's "not available in this
  combination" state is gone — any combination of a product's own option
  values is addable to cart as long as the product itself is in stock and
  ordering-enabled.
- [x] **Shop-wide reusable option library — define an option type once
  (e.g. Color: Blue, Red, Green) and attach it to any product.** See
  [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md)'s "Third course
  correction" section (US-40). `product_option_types`/`product_option_values`
  became shop-wide (`option_types`/`option_values`, same migration `0011`
  as above — both share the same underlying tables so they share one
  migration); each product attaches a type and picks a subset of its
  values (`product_options`/`product_option_selections`) via a new
  `/admin/options` library page plus a reworked Options section on the
  product page. `display_style` is a global setting on the option type.
- [x] **Product options beyond color: admin-configurable custom choices
  (thread color, size, length, etc.), not just a single flat variant.**
  See [PRODUCT_OPTIONS_DESIGN.md](./PRODUCT_OPTIONS_DESIGN.md) for the full
  design. Admin defines option types per product (Color, Thread Color,
  Size, ...) each with its own ordered value list
  (`product_option_types`/`product_option_values`, migration
  `0009_product_options.sql`), each displayed on the PDP as either swatch
  buttons or a dropdown (`display_style`, admin's choice per option
  type — US-39, migration `0010_product_level_stock.sql`); a variant is a
  combination of one value per type (`product_variant_options`), immutable
  after creation. Stock is a single production-capacity number per
  *product* (`products.stock_quantity`), not per variant/option
  combination — all v1 products are made-to-order, so every option
  combination is orderable or sold out together
  (`decrement_product_stock`/`restore_product_stock`). Existing variants/
  orders migrated losslessly (variant ids preserved, order display
  snapshotted onto `order_items.variant_label`; each product's existing
  per-variant stock summed into its new single capacity number). Built on
  a separate `feat/product-options` branch — run migration `0010` before
  merging to `develop` (see MANUAL_TASKS.md).
- [x] **Narrow tooltips to the header navbar only.** Removed the `Tooltip`
  wrapping from `ActionButton`, the cart's Remove button, `admin/faq`'s
  move-up/down/save icons, and `account/addresses`'s delete/save icons —
  `src/app/layout.tsx`'s navbar icons are the only ones tooltipped now.
- [x] **Icon-only controls now show a hover/focus tooltip.** New shared
  `src/components/Tooltip.tsx` (pure CSS, `group/tooltip` + `group-hover`/
  `group-focus-within`, no new dependency) wraps every icon-only control:
  header nav (`src/app/layout.tsx`), `CartLink`, the cart's trash-icon
  Remove button, `ActionButton` (auto-applies via its existing `ariaLabel`
  prop — covers delete variant/photo/FAQ item, cancel order), FAQ
  move-up/down and the per-item save icon, and the saved-address
  delete/save icons. Cart's −/+ quantity buttons were deliberately left
  untooltipped per manual-testing feedback — the glyphs are self-explanatory,
  a tooltip there was noise.
- [x] **Contact Us page: email + Instagram icons, real handle instead of
  the word "Instagram".** `src/app/contact/page.tsx` now shows an icon next
  to both links, keeping the existing text. Added a
  `contactInstagramHandle` setting (`supabase/migrations/0008_contact_instagram_handle.sql`,
  wired through `src/lib/settings.ts` and a new field on
  `/admin/settings`) instead of parsing the handle out of the URL.
- [x] **Admin: success toast for save actions, not just delete/mark/cancel.**
  New `src/components/admin/ActionForm.tsx` (`useActionState` + the
  existing `ToastProvider`) covers the actions `ActionButton` couldn't:
  save product, add variant, save all variants, upload photo, create
  product, create/update FAQ item, save settings. Each action now takes
  `(prevState, formData)` and returns `ActionResult`; a sibling
  `src/components/admin/SubmitButton.tsx` reads pending state via React's
  `useFormStatus` (not a render prop — a Server Component can't pass a
  function as `children` to a Client Component; that RSC violation crashed
  every converted admin page on first manual test, fixed by moving pending
  state into `SubmitButton` instead of prop-drilling it through
  `children`). `createProductAction` keeps its `redirect()` on success
  (navigating to the new product's edit page is the success signal) but
  now also catches validation errors into a toast instead of a bare
  Next.js error page.
- [x] Customer-facing "my orders" page — shipped as part of Phase 8
  (customer accounts): `/account` shows order history grouped by status,
  `/account/addresses` handles saved addresses (US-18).
- [x] Admin → Products: variant list Delete and product photo Delete are
  now trash icons (inline SVG, no icon library added — matches the
  pattern already used on FAQ/addresses).
- [x] Admin → Products: variant list now saves all rows in one submit
  (single form, per-row Delete via `formAction` override) instead of one
  form per variant.
- [x] Cart page: each line item shows a photo thumbnail (falls back to a
  placeholder box for items added before this change, since existing
  localStorage carts won't have `photoUrl`), and "Remove" is a trash icon.
- [x] Header nav: Shop and Cart are icons instead of text (Cart keeps its
  item-count badge); footer nav stays text-only.
- [x] Header nav: Log In is now an icon too (login/arrow glyph), matching
  the rest of the nav regardless of auth state.
- [x] Admin: delete variant/photo/FAQ item and cancel order now show a
  native `window.confirm()` prompt first; all six named mutations (those
  three deletes, mark paid, mark shipped, cancel order) show a toast on
  success or on a thrown error, instead of a bare Next.js error page. New
  `ActionButton` client component (`src/components/admin/ActionButton.tsx`)
  invokes the bound Server Action directly (no `<form>`) so it works
  uniformly even for the variant-delete button, which sits inside the
  batch-save form.