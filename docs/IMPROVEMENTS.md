# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

Nothing outstanding right now — see Done below.

## Done

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