# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

- [ ] **Bug: a dropdown-style option with only one value permanently
  blocks Add to Cart.** Found during manual testing (MANUAL_TESTING.md,
  "Product options: shop-wide library" checklist). In
  `src/app/products/[slug]/ProductDetail.tsx`, `selectedOptions` state
  starts empty (`useState({})`) and a dropdown's `value` reads
  `selectedOptions[type.name] ?? ""`; it's only populated via the
  `<select>`'s `onChange`. A native `<select>` never fires `onChange` when
  it has just one `<option>` — there's no other value to change to — so
  `selectedOptions[type.name]` stays `undefined` forever,
  `canAddToCart`'s `every(type => !!selectedOptions[type.name])` check
  never passes, and Add to Cart stays disabled with no way for the
  shopper to satisfy it. The `buttons` display style doesn't have this
  problem (its `onClick` fires regardless of how many values exist).
  Fix needs to default/seed `selectedOptions` for any dropdown-style
  option type that has exactly one attached value.
- [ ] **`/admin/options` breadcrumb reads "Admin / Products / Options"
  and its "Products" crumb links to `/admin/products`.** Found during
  manual testing (same checklist as above). The route itself is correct
  (`src/app/admin/options/page.tsx` is `/admin/options`, not nested under
  products) — the bug is the page's hardcoded `Breadcrumbs` array (lines
  ~60-66), which still has a `{ label: "Products", href: "/admin/products"
  }` crumb in the middle, evidently left over from copying
  `/admin/products/page.tsx`'s breadcrumb array. Should just be
  `Admin / Options`.
- [ ] **`/admin/options` should have one library-wide save instead of a
  separate save button per option type/value row.** Found during the same
  manual-testing pass. Currently every type and value row is its own
  independent `ActionForm` + server action
  (`updateOptionTypeAction`/`updateOptionValueAction` in
  `src/app/admin/actions.ts`), each submitting on its own — with N types
  and M values that's N+M+2 separate forms/round-trips. Matches the
  pattern already fixed for per-product option *selections* (batched into
  one "Save options" submit, see IMPROVEMENTS.md Done below /
  MANUAL_TASKS.md's 0012 entry) — would need the same treatment here:
  collect edits into client state and submit the whole library in one
  server action.

## Done

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