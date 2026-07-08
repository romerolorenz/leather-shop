# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

- [ ] **Narrow tooltips to the header navbar only.** Currently `Tooltip`
  (`src/components/Tooltip.tsx`) is applied broadly — navbar, every
  `ActionButton` use (admin delete/mark/cancel icons), FAQ move-up/down and
  the per-item save icon, and the saved-address delete/save icons (see the
  "Icon-only controls" Done entry below). Manual-testing feedback: "I only
  want the tooltips on the navbar; let's remove the others." When
  implemented, remove the `Tooltip` wrapping from `ActionButton`
  (`src/components/admin/ActionButton.tsx`), the cart's Remove button
  (`src/app/cart/CartView.tsx`), `src/app/admin/faq/page.tsx`'s
  move-up/down/save icons, and `src/app/account/addresses/page.tsx`'s
  delete/save icons — leave `src/app/layout.tsx`'s navbar icons as the only
  ones tooltipped.
- [ ] **Product options beyond color: admin-configurable custom choices
  (thread color, size, length, etc.), not just a single flat variant.**
  Today a product's only selectable dimension is `product_variants.label`
  — a single free-text field per row (`supabase/migrations/0001_init.sql`)
  with one stock/capacity count each. The admin edit page
  (`src/app/admin/products/[id]/page.tsx`) lets you add/edit/delete these
  flat labels, and the PDP (`src/app/products/[slug]/ProductDetail.tsx`,
  ~line 48-49) hardcodes the heading "Color" over a single row of swatch
  buttons built from that one label list — there's no way to add a second
  independent choice (e.g. thread color) without hacking it into the same
  free-text label (e.g. typing "Black / Natural thread" as one variant),
  which breaks stock tracking per real combination and reads wrong under a
  "Color" heading. This is actually a gap against the PRD, not new scope —
  `docs/PRODUCT_REQUIREMENTS.md` §3/§5 and **US-3** already call for
  "select a color, size, and thread color from fixed dropdown/swatch
  options," but only the single flat dimension got built.
  Direction: introduce admin-defined **option types** per product (e.g.
  "Color", "Thread Color", "Size", "Length"), each with its own ordered
  list of admin-entered values, and make a **variant** a combination of one
  value per option type (the standard e-commerce options→variants model).
  This is a bigger change than the polish items above — touches the data
  model (new `product_option_types` / `product_option_values` tables, or
  similar; a migration), `src/lib/admin/catalog.ts` and `src/lib/products.ts`
  (variant shape and combination logic), the admin product edit UI (define
  option types + generate/manage variant combinations instead of one flat
  list), the PDP (a selector group per option type instead of one "Color"
  swatch row), and the cart item shape (`CartItem.variant` in
  `src/lib/cart-context.tsx:11-17` is a single string today — would need to
  become structured, e.g. an array of `{ optionType, value }`, echoed
  through checkout/order emails which currently just print the flat variant
  label). Existing products/orders only have the single flat label, so this
  needs a migration path, not a breaking rewrite of existing data.

## Done

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