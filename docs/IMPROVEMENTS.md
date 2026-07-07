# Improvements — Leather Shop

Non-blocking UX/quality improvements identified during review, queued up for
later work. Not started until explicitly requested — see items below.

## Outstanding

- [ ] **Admin: confirmation/feedback modals on destructive and
  state-changing actions.** Every admin mutation today is a bare
  `<form action={...}>` that submits and revalidates with no confirmation
  step and no success/error feedback — a stray click deletes or changes
  state immediately. Relevant actions: delete variant, delete product
  photo (`src/app/admin/products/[id]/page.tsx`), delete FAQ item
  (`src/app/admin/faq/page.tsx`), mark order paid/shipped, cancel order +
  restore stock (`src/app/admin/orders/page.tsx`). At minimum add a
  confirm step before the destructive ones (delete variant/photo/FAQ,
  cancel order); a success/error toast or modal after any of them would
  also cover thrown errors (e.g. `addVariantAction`'s "Variant label is
  required") that currently just surface as a Next.js error page instead
  of inline feedback. No modal/toast primitive exists in the codebase yet
  — pick one (native `<dialog>`, a small custom component, or a library)
  before wiring it up everywhere.
- [ ] **Header nav: "Log In" is still a text link, inconsistent with the
  rest of the nav.** `src/app/layout.tsx:68-86` shows a person icon linking
  to `/account` when `customerEmail` is set, but falls back to a plain
  `Log In` text link (line 85) when logged out — every other nav item
  (Shop, Account, Cart) is icon-only. Give the logged-out state an icon
  too (e.g. a login/person-outline icon) so the nav is visually consistent
  regardless of auth state, keeping an `aria-label="Log In"` since the
  visible text goes away.

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