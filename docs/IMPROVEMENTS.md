# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

- [ ] **Icon-only controls need a hover tooltip, not just `aria-label`.**
  All the icon work above (header nav, admin action buttons, cart, FAQ
  reorder/save, saved addresses) left every icon with an `aria-label` for
  screen readers but nothing visible on mouse hover — a sighted user has
  to guess or click to find out what an icon does. Worst case is the
  header nav (`src/app/layout.tsx:71-143`): FAQ, Contact Us, Shop,
  My Account/Log In, and Cart are now five icons in a row with zero
  visible text and no hover hint. Same gap on
  `src/components/admin/ActionButton.tsx` (delete/mark paid/mark
  shipped/cancel), the FAQ move-up/down/save icons
  (`src/app/admin/faq/page.tsx`), and the saved-address delete/save icons
  (`src/app/account/addresses/page.tsx`). Cheapest fix: add a native
  `title` attribute alongside each existing `aria-label` (zero JS, browser
  default styling, but inconsistent look across browsers and no styling
  control). Nicer fix: a small shared `Tooltip` component — no
  tooltip/icon-library primitive exists in the codebase yet, so pick one
  approach and apply it everywhere rather than mixing native `title` in
  some places and a custom component in others.

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