# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

(none — see Done below)

## Done

- [x] **`/admin/options` uses an edit-modal pattern instead of inline
  batch-editable fields**, matching `/account/addresses`
  (`AddressFormModal.tsx`): each option type/value is shown read-only with
  a pencil-icon "Edit" button opening a `<dialog>` form pre-filled via
  `defaultValues` (`OptionTypeFormModal.tsx`, `OptionValueFormModal.tsx`,
  both in `src/components/admin/`). Unlike `AddressFormModal`'s
  `onSubmit={close}`, these submit through `useActionState` so a thrown
  error toasts and keeps the dialog open instead of closing before the
  action resolves. New single-row `updateOptionTypeAction(id, prevState,
  formData)` / `updateOptionValueAction(id, prevState, formData)` replace
  the old batched `updateOptionLibraryAction`; create/delete flows are
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
